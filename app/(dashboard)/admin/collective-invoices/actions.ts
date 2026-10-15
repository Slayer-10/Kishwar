'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { dispatchNotification } from '@/lib/notifications/dispatch';

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

export async function generateCollectiveInvoicesAction(
  formData: FormData
): Promise<void> {
  const admin = await requireSuperAdmin();

  const selectedAmbassadorId = String(
    formData.get('ambassadorId') ?? 'ALL'
  ).trim();

  if (!selectedAmbassadorId) {
    throw new Error('Select a valid Ambassador billing scope.');
  }

  if (selectedAmbassadorId !== 'ALL') {
    const ambassador = await prisma.ambassador.findFirst({
      where: {
        id: selectedAmbassadorId,
        user: { isActive: true },
      },
      select: { id: true },
    });

    if (!ambassador) {
      throw new Error('The selected Ambassador is not active or does not exist.');
    }
  }

  const batchScope = `BATCH-${randomUUID()}`;

  const tiers = await prisma.discountTier.findMany({
    where: { isActive: true },
    orderBy: { minimumRegistrations: 'asc' },
    select: {
      id: true,
      name: true,
      minimumRegistrations: true,
      discountPercent: true,
    },
  });

  const ambassadors = await prisma.ambassador.findMany({
    where: {
      user: { isActive: true },
      ...(selectedAmbassadorId === 'ALL'
        ? {}
        : { id: selectedAmbassadorId }),
    },
    select: { id: true },
  });

  for (const { id: ambassadorId } of ambassadors) {
    const createdInvoice = await prisma.$transaction(async (tx) => {
      // Serialize regeneration for this Ambassador.
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtextextended(${`collective-invoice:${ambassadorId}`}, 0)
        )
      `;

      // Remove ONLY unpaid collective invoices for this Ambassador.
      const oldPending = await tx.collectiveInvoice.findMany({
        where: {
          ambassadorId,
          status: 'PENDING',
        },
        select: { id: true },
      });

      const oldIds = oldPending.map((invoice) => invoice.id);

      if (oldIds.length > 0) {
        await tx.collectiveInvoiceItem.deleteMany({
          where: { collectiveInvoiceId: { in: oldIds } },
        });

        await tx.collectiveInvoice.deleteMany({
          where: {
            id: { in: oldIds },
            ambassadorId,
            status: 'PENDING',
          },
        });
      }

      // Rebuild from ALL events after releasing old invoice-item claims.
      const registrations = await tx.registration.findMany({
        where: {
          ambassadorId,
          reviewStatus: 'APPROVED',
          status: { notIn: ['PAID', 'REJECTED'] },
          invoice: null,
          collectiveInvoiceItem: null,
        },
        select: {
          id: true,
          event: { select: { registrationFee: true } },
          accommodationFee: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (registrations.length === 0) {
        return null;
      }

      const subtotal = registrations.reduce(
        (sum, registration) =>
          sum +
          Number(registration.event.registrationFee) +
          Number(registration.accommodationFee ?? 0),
        0
      );

      const tier = [...tiers]
        .reverse()
        .find((item) => registrations.length >= item.minimumRegistrations);

      const discountPercent = Number(tier?.discountPercent ?? 0);
      const discountAmount = Number(
        ((subtotal * discountPercent) / 100).toFixed(2)
      );
      const totalAmount = Number((subtotal - discountAmount).toFixed(2));

      const invoice = await tx.collectiveInvoice.create({
        data: {
          ambassadorId,
          scopeKey: batchScope,
          invoiceNumber: `KSH-COL-${randomUUID()
            .slice(0, 12)
            .toUpperCase()}`,
          status: 'PENDING',
          subtotal,
          discountPercent,
          discountAmount,
          totalAmount,
          generatedById: admin.id,
          eventId: null,
        },
      });

      const lineItems = registrations.map((registration) => {
        const baseAmount =
          Number(registration.event.registrationFee) +
          Number(registration.accommodationFee ?? 0);

        const itemDiscount = Number(
          ((baseAmount * discountPercent) / 100).toFixed(2)
        );

        return {
          collectiveInvoiceId: invoice.id,
          registrationId: registration.id,
          baseAmount,
          discountAmount: itemDiscount,
          finalAmount: Number((baseAmount - itemDiscount).toFixed(2)),
        };
      });

      const lineTotal = lineItems.reduce(
        (sum, item) => sum + item.finalAmount,
        0
      );

      const difference = Number((totalAmount - lineTotal).toFixed(2));

      if (difference !== 0 && lineItems.length > 0) {
        lineItems[lineItems.length - 1].finalAmount = Number(
          (lineItems[lineItems.length - 1].finalAmount + difference).toFixed(2)
        );
      }

      await tx.collectiveInvoiceItem.createMany({
        data: lineItems,
      });

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount,
      };
    });

    // Send notification only when a new invoice was created.
    if (createdInvoice) {
      try {
        const ambassador = await prisma.ambassador.findUnique({
          where: { id: ambassadorId },
          select: { user: { select: { email: true } } },
        });

        const email = ambassador?.user.email;

        if (email) {
          await dispatchNotification({
            event: 'invoice_generated',
            recipientName: email,
            recipientEmail: email,
            subject: `Collective Invoice Generated - ${createdInvoice.invoiceNumber}`,
            message:
              `A collective invoice (${createdInvoice.invoiceNumber}) ` +
              `for PKR ${createdInvoice.totalAmount.toFixed(2)} has been generated.`,
            idempotencyKey: `inv_${createdInvoice.id}`,
          });
        }
      } catch (notificationError) {
        console.error(
          '[generateCollectiveInvoicesAction] Notification error:',
          notificationError
        );
      }
    }
  }

  revalidatePath('/admin/collective-invoices');
  revalidatePath('/admin/registration-requests');
  revalidatePath('/admin/registrations');
  revalidatePath('/ambassador');
}

export async function confirmCollectiveInvoicePaymentAction(invoiceId: string) {
  const admin = await requireSuperAdmin();

  if (!invoiceId || typeof invoiceId !== 'string') {
    return {
      success: false,
      message: 'A valid invoice ID is required.',
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.collectiveInvoice.findUnique({
        where: { id: invoiceId },
        include: {
          items: {
            include: {
              registration: true,
            },
          },
        },
      });

      if (!invoice) {
        throw new Error('INVOICE_NOT_FOUND');
      }

      if (invoice.status === 'PAID') {
        throw new Error('INVOICE_ALREADY_PAID');
      }

      if (!invoice.items.length) {
        throw new Error('INVOICE_HAS_NO_ITEMS');
      }

      // Validate every item before making changes
      for (const item of invoice.items) {
        const registration = item.registration;

        if (!registration) {
          throw new Error('REGISTRATION_NOT_FOUND');
        }

        if (
          registration.reviewStatus === 'PENDING_ADMIN' ||
          registration.reviewStatus === 'PENDING_AMBASSADOR' ||
          registration.reviewStatus === 'REJECTED'
        ) {
          throw new Error('INVOICE_CONTAINS_INELIGIBLE_REGISTRATION');
        }

        if (registration.status === 'PAID') {
          throw new Error('REGISTRATION_ALREADY_PAID');
        }
      }

      const now = new Date();

      // Mark invoice as PAID and set paidConfirmedById
      const updatedInvoice = await tx.collectiveInvoice.updateMany({
        where: {
          id: invoiceId,
          status: 'PENDING',
        },
        data: {
          status: 'PAID',
          paidAt: now,
          paidConfirmedById: admin.id,
        },
      });

      if (updatedInvoice.count !== 1) {
        throw new Error('INVOICE_STATUS_CHANGED');
      }

      // Update attached registrations to PAID status
      for (const item of invoice.items) {
        await tx.registration.update({
          where: {
            id: item.registrationId,
          },
          data: {
            status: 'PAID',
            paymentConfirmedAt: now,
            paymentConfirmedById: admin.id,
          },
        });
      }

      return {
        invoiceId: invoice.id,
        registrationCount: invoice.items.length,
      };
    });

    revalidatePath('/admin/collective-invoices');
    revalidatePath('/admin/registration-requests');
    revalidatePath('/admin/registrations');
    revalidatePath('/ambassador');

    // Trigger notification after transaction succeeds
    try {
      const updatedInv = await prisma.collectiveInvoice.findUnique({
        where: { id: invoiceId },
        select: {
          invoiceNumber: true,
          totalAmount: true,
          ambassador: { select: { user: { select: { email: true } } } },
        },
      });

      if (updatedInv?.ambassador.user.email) {
        await dispatchNotification({
          event: 'payment_confirmed',
          recipientName: updatedInv.ambassador.user.email,
          recipientEmail: updatedInv.ambassador.user.email,
          subject: `Payment Confirmed - Invoice ${updatedInv.invoiceNumber}`,
          message: `Payment for collective invoice ${updatedInv.invoiceNumber} (PKR ${Number(updatedInv.totalAmount).toFixed(2)}) has been confirmed by Kishwar Admin. Included registrations are now verified.`,
          idempotencyKey: `pay_${invoiceId}`,
        });
      }
    } catch (notifyErr) {
      console.error('[confirmCollectiveInvoicePaymentAction] Notification error:', notifyErr);
    }

    return {
      success: true,
      message: 'Payment confirmed successfully.',
      data: result,
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';

    const messages: Record<string, string> = {
      INVOICE_NOT_FOUND: 'Invoice not found.',
      INVOICE_ALREADY_PAID: 'This invoice has already been paid.',
      INVOICE_HAS_NO_ITEMS: 'This invoice has no registrations.',
      REGISTRATION_NOT_FOUND:
        'A registration linked to this invoice could not be found.',
      INVOICE_CONTAINS_INELIGIBLE_REGISTRATION:
        'This invoice contains a registration that is not eligible for payment confirmation.',
      REGISTRATION_ALREADY_PAID:
        'A linked registration is already marked as paid. Review the invoice before continuing.',
      INVOICE_STATUS_CHANGED:
        'The invoice status changed. Refresh the page and review it again.',
    };

    return {
      success: false,
      message: messages[code] ?? 'Unable to confirm payment.',
    };
  }
}

export const confirmCollectiveInvoicePayment = confirmCollectiveInvoicePaymentAction;

export async function getCollectiveInvoiceItemsAction(
  collectiveInvoiceId: string
) {
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
          status: true,
          reviewStatus: true,
          event: { select: { name: true } },
          participant: {
            select: { fullName: true, email: true, cnic: true },
          },
          team: { select: { name: true } },
          ambassador: {
            select: {
              ambassadorCode: true,
              user: { select: { email: true } },
              university: { select: { name: true } },
            },
          },
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
    participantCnic: item.registration.participant?.cnic || 'N/A',
    ambassadorCode: item.registration.ambassador?.ambassadorCode || 'N/A',
    ambassadorEmail: item.registration.ambassador?.user.email || 'N/A',
    ambassadorUniversity:
      item.registration.ambassador?.university.name || 'No Ambassador',
    reviewStatus: item.registration.reviewStatus,
    paymentStatus: item.registration.status,
    baseAmount: Number(item.baseAmount),
    discountAmount: Number(item.discountAmount),
    finalAmount: Number(item.finalAmount),
  }));
}

