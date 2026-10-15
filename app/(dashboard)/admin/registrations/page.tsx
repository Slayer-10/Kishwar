import React from 'react';
import { prisma } from '@/lib/prisma';
import {
  AdminRegistrationFilters,
  type AdminRegistrationRow,
} from '@/components/dashboard/AdminRegistrationFilters';

export const dynamic = 'force-dynamic';

export default async function AdminRegistrationsPage() {
  const registrations = await prisma.registration.findMany({
    include: {
      event: true,
      participant: true,
      team: {
        include: {
          captain: true,
          university: true,
          ambassador: {
            include: {
              user: {
                include: {
                  participant: true,
                },
              },
            },
          },
        },
      },
      invoice: true,
      collectiveInvoiceItem: {
        include: {
          collectiveInvoice: {
            select: {
              status: true,
            },
          },
        },
      },
      ambassador: {
        include: {
          user: {
            include: {
              participant: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rows: AdminRegistrationRow[] = registrations.map((r) => {
    const effectiveAmbassador = r.ambassador ?? r.team?.ambassador ?? null;
    const effectiveAmbassadorId = r.ambassadorId ?? r.team?.ambassadorId ?? null;

    let routeCategory: 'AMBASSADOR' | 'NO_AMBASSADOR' | 'UNKNOWN';
    let ambassadorName: string | null = null;

    if (effectiveAmbassadorId && effectiveAmbassador) {
      routeCategory = 'AMBASSADOR';
      ambassadorName =
        effectiveAmbassador.user.participant?.fullName ??
        effectiveAmbassador.user.email ??
        (effectiveAmbassador.ambassadorCode ? `Code: ${effectiveAmbassador.ambassadorCode}` : null);
    } else if (effectiveAmbassadorId) {
      // Historical ID whose ambassador record was removed
      routeCategory = 'UNKNOWN';
      ambassadorName = null;
    } else if (r.source === 'PUBLIC') {
      // Confirmed to have no assigned Ambassador and follows the Admin-managed route
      routeCategory = 'NO_AMBASSADOR';
      ambassadorName = null;
    } else {
      // Legacy records whose attribution cannot be reliably determined
      routeCategory = 'UNKNOWN';
      ambassadorName = null;
    }

    const registrantName = r.team
      ? `${r.team.name} (${r.team.captain.fullName}${r.team.university ? `, ${r.team.university.name}` : ''})`
      : r.participant?.fullName ?? 'Unknown';

    return {
      id: r.id,
      eventName: r.event.name,
      registrantName,
      type: r.team ? 'Team' : 'Individual',
      status: r.status,
      reviewStatus: r.reviewStatus,
      paymentStatus: r.status,
      hasIndividualInvoice: Boolean(r.invoice),
      individualInvoiceStatus: r.invoice?.status ?? null,
      hasCollectiveInvoice: Boolean(r.collectiveInvoiceItem),
      collectiveInvoiceStatus:
        r.collectiveInvoiceItem?.collectiveInvoice?.status ?? null,
      invoiceType: r.collectiveInvoiceItem
        ? 'COLLECTIVE'
        : r.invoice
          ? 'INDIVIDUAL'
          : null,
      invoiceStatus: r.invoice?.status ?? null,
      invoiceAmount: r.invoice ? r.invoice.amount.toString() : null,
      registeredAt: r.createdAt.toISOString(),
      ambassadorId: effectiveAmbassadorId,
      ambassadorName,
      routeCategory,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col">
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--fs-title1)',
            lineHeight: 'var(--lh-title1)',
            color: 'var(--color-text)',
          }}
          className="font-bold uppercase tracking-tight"
        >
          Registrations
        </h1>
        <div
          className="mt-2 h-[4px] w-[56px] rounded-[2px]"
          style={{ backgroundColor: 'var(--color-primary)' }}
        />
      </div>

      <AdminRegistrationFilters registrations={rows} />
    </div>
  );
}
