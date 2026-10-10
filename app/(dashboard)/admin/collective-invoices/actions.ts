'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';

async function requireSuperAdmin() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized access.');
  }

  return user;
}

function parseMoney(value: FormDataEntryValue | null) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Enter a valid non-negative amount.');
  }

  return amount;
}

function parsePositiveInteger(value: FormDataEntryValue | null) {
  const amount = Number(value);

  if (!Number.isInteger(amount) || amount < 1) {
    throw new Error('Minimum registrations must be a positive integer.');
  }

  return amount;
}

export async function createDiscountTierAction(formData: FormData) {
  await requireSuperAdmin();

  try {
    const name = String(formData.get('name') ?? '').trim();
    const minimumRegistrations = parsePositiveInteger(
      formData.get('minimumRegistrations')
    );
    const discountPercent = parseMoney(formData.get('discountPercent'));

    if (!name) throw new Error('Tier name is required.');

    if (discountPercent > 100) {
      throw new Error('Discount cannot exceed 100%.');
    }

    await prisma.discountTier.create({
      data: {
        name,
        minimumRegistrations,
        discountPercent,
        isActive: true,
      },
    });

    revalidatePath('/admin/collective-invoices');
  } catch (err: any) {
    if (err?.code === 'P2002') {
      throw new Error('A discount tier with this name or minimum registration threshold already exists.');
    }
    throw new Error(err?.message || 'Failed to create discount tier.');
  }
}

export async function updateDiscountTierAction(formData: FormData) {
  await requireSuperAdmin();

  try {
    const id = String(formData.get('id') ?? '');
    const name = String(formData.get('name') ?? '').trim();
    const minimumRegistrations = parsePositiveInteger(
      formData.get('minimumRegistrations')
    );
    const discountPercent = parseMoney(formData.get('discountPercent'));
    const isActive = formData.get('isActive') === 'on';

    if (!id || !name) throw new Error('Tier ID and name are required.');

    if (discountPercent > 100) {
      throw new Error('Discount cannot exceed 100%.');
    }

    await prisma.discountTier.update({
      where: { id },
      data: {
        name,
        minimumRegistrations,
        discountPercent,
        isActive,
      },
    });

    revalidatePath('/admin/collective-invoices');
  } catch (err: any) {
    if (err?.code === 'P2002') {
      throw new Error('A discount tier with this name or minimum registration threshold already exists.');
    }
    throw new Error(err?.message || 'Failed to update discount tier.');
  }
}

export async function generateCollectiveInvoicesAction(_formData?: FormData): Promise<void> {
  const admin = await requireSuperAdmin();

  /*
   * Each manual run is a separate billing batch.
   * All eligible registrations across events are grouped by Ambassador.
   * Registrations already attached to an invoice are excluded.
   *
   * Do not generate invoices for pending or rejected requests.
   * Do not create individual invoices for these registrations.
   */

  const batchScope = `BATCH-${randomUUID()}`;

  const [tiers, eligible] = await Promise.all([
    prisma.discountTier.findMany({
      where: { isActive: true },
      orderBy: { minimumRegistrations: 'asc' },
      select: {
        id: true,
        name: true,
        minimumRegistrations: true,
        discountPercent: true,
      },
    }),

    prisma.registration.findMany({
      where: {
        ambassadorId: { not: null },
        reviewStatus: 'APPROVED',
        status: { not: 'REJECTED' },
        collectiveInvoiceItem: null,
        invoice: null,
      },
      select: {
        id: true,
        ambassadorId: true,
        accommodationFee: true,
        event: {
          select: {
            registrationFee: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  if (eligible.length === 0) {
    revalidatePath('/admin/collective-invoices');
    return;
  }

  const grouped = new Map<string, typeof eligible>();

  for (const registration of eligible) {
    if (!registration.ambassadorId) continue;

    const group = grouped.get(registration.ambassadorId) ?? [];
    group.push(registration);
    grouped.set(registration.ambassadorId, group);
  }

  /*
   * Use a transaction per Ambassador. The unique registrationId on
   * CollectiveInvoiceItem prevents duplicate billing across batches.
   * If a competing request invoices a registration first, its transaction
   * must fail rather than charge that registration twice.
   */
  const entries = Array.from(grouped.entries());

  for (const [ambassadorId, registrations] of entries) {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.registration.findMany({
        where: {
          id: { in: registrations.map((registration) => registration.id) },
          ambassadorId,
          reviewStatus: 'APPROVED',
          status: { not: 'REJECTED' },
          collectiveInvoiceItem: null,
          invoice: null,
        },
        select: {
          id: true,
          event: { select: { registrationFee: true } },
          accommodationFee: true,
        },
      });

      if (fresh.length === 0) return;

      /*
       * Recalculate using the registrations still eligible inside the
       * transaction; do not trust the earlier preview/query for billing.
       */
      const freshSubtotal = fresh.reduce(
        (sum, registration) =>
          sum +
          Number(registration.event.registrationFee) +
          Number(registration.accommodationFee ?? 0),
        0
      );

      // Only the highest qualifying active tier applies
      const freshTier = [...tiers]
        .reverse()
        .find((item) => fresh.length >= item.minimumRegistrations);

      const freshDiscountPercent = Number(freshTier?.discountPercent ?? 0);
      const freshDiscountAmount = Number(
        ((freshSubtotal * freshDiscountPercent) / 100).toFixed(2)
      );
      const freshTotal = Number(
        (freshSubtotal - freshDiscountAmount).toFixed(2)
      );

      const invoice = await tx.collectiveInvoice.create({
        data: {
          ambassadorId,
          scopeKey: batchScope,
          invoiceNumber: `KSH-COL-${randomUUID()
            .slice(0, 12)
            .toUpperCase()}`,
          status: 'PENDING',
          subtotal: freshSubtotal,
          discountPercent: freshDiscountPercent,
          discountAmount: freshDiscountAmount,
          totalAmount: freshTotal,
          generatedById: admin.id,
          eventId: null,
        },
      });

      // Calculate line items with deterministic 1-paisa rounding allocation
      let itemsSum = 0;
      const rawItems = fresh.map((registration) => {
        const baseAmount =
          Number(registration.event.registrationFee) +
          Number(registration.accommodationFee ?? 0);

        const itemDiscount = Number(
          ((baseAmount * freshDiscountPercent) / 100).toFixed(2)
        );
        const finalAmount = Number((baseAmount - itemDiscount).toFixed(2));
        itemsSum += finalAmount;

        return {
          registrationId: registration.id,
          baseAmount,
          discountAmount: itemDiscount,
          finalAmount,
        };
      });

      // Adjust rounding discrepancy on the last item if sum(item.finalAmount) != freshTotal
      const diff = Number((freshTotal - itemsSum).toFixed(2));
      if (diff !== 0 && rawItems.length > 0) {
        const last = rawItems[rawItems.length - 1];
        last.finalAmount = Number((last.finalAmount + diff).toFixed(2));
      }

      await tx.collectiveInvoiceItem.createMany({
        data: rawItems.map((item) => ({
          collectiveInvoiceId: invoice.id,
          registrationId: item.registrationId,
          baseAmount: item.baseAmount,
          discountAmount: item.discountAmount,
          finalAmount: item.finalAmount,
        })),
      });
    });
  }

  revalidatePath('/admin/collective-invoices');
  revalidatePath('/admin/registration-requests');
  revalidatePath('/ambassador');
}

export async function getCollectiveInvoiceItemsAction(collectiveInvoiceId: string) {
  await requireSuperAdmin();

  if (!collectiveInvoiceId) {
    throw new Error('Invoice ID is required.');
  }

  const items = await prisma.collectiveInvoiceItem.findMany({
    where: { collectiveInvoiceId },
    select: {
      id: true,
      baseAmount: true,
      discountAmount: true,
      finalAmount: true,
      registration: {
        select: {
          id: true,
          event: { select: { name: true } },
          participant: { select: { fullName: true, email: true, cnic: true } },
          team: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return items.map((item) => ({
    id: item.id,
    registrationId: item.registration.id,
    eventName: item.registration.event.name,
    participantName:
      item.registration.participant?.fullName ||
      item.registration.team?.name ||
      'N/A',
    participantEmail: item.registration.participant?.email || 'N/A',
    baseAmount: Number(item.baseAmount),
    discountAmount: Number(item.discountAmount),
    finalAmount: Number(item.finalAmount),
  }));
}
