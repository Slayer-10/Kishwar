import React from 'react';
import { prisma } from '@/lib/prisma';
import { StatusBadge } from '@/components/ui/StatusBadge';

export const dynamic = "force-dynamic";

export default async function FdoPaymentsPage() {
  const payments = await prisma.payment.findMany({
    include: {
      invoice: {
        include: {
          registration: {
            include: { event: true, participant: true, team: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
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
          Payments
        </h1>
        <div
          className="mt-2 h-[4px] w-[56px] rounded-[2px]"
          style={{ backgroundColor: 'var(--color-primary)' }}
        />
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Read-only view. Verifying or rejecting a payment is done by an admin under Admin → Payments.
        </p>
      </div>

      <div className="w-full overflow-x-auto rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr
              style={{ backgroundColor: 'var(--color-secondary)', color: '#FFFFFF' }}
              className="font-heading text-xs uppercase tracking-wider h-[48px]"
            >
              <th className="px-5 py-3 font-semibold">Event</th>
              <th className="px-5 py-3 font-semibold">Registrant</th>
              <th className="px-5 py-3 font-semibold">Amount</th>
              <th className="px-5 py-3 font-semibold">Method</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-divider)]">
            {payments.map((p) => (
              <tr
                key={p.id}
                className="h-[56px] transition-colors hover:bg-[rgba(106,172,220,0.08)]"
              >
                <td className="px-5 py-3 font-semibold text-[var(--color-text)]">
                  {p.invoice.registration.event.name}
                </td>
                <td className="px-5 py-3 text-[var(--color-text)]">
                  {p.invoice.registration.participant?.fullName ??
                    p.invoice.registration.team?.name ??
                    'Unknown'}
                </td>
                <td className="px-5 py-3 font-bold text-[var(--color-primary)]">
                  PKR {p.amount.toString()}
                </td>
                <td className="px-5 py-3 text-[var(--color-text-muted)]">{p.method}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={p.verificationStatus} />
                </td>
              </tr>
            ))}

            {payments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-[var(--color-text-muted)]">
                  No payments submitted yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
