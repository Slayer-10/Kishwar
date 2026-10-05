import React from 'react';
import { prisma } from '@/lib/prisma';
import { verifyPaymentAction, rejectPaymentAction } from '@/app/(dashboard)/admin/actions';
import { Button } from '@/components/ui/Button';

export default async function AdminPaymentsPage() {
  const payments = await prisma.payment.findMany({
    where: { verificationStatus: 'SUBMITTED' },
    include: {
      invoice: {
        include: {
          registration: {
            include: { event: true, participant: true, team: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
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
          Payment Verification
        </h1>
        <div
          className="mt-2 h-[4px] w-[56px] rounded-[2px]"
          style={{ backgroundColor: 'var(--color-primary)' }}
        />
      </div>

      <div className="flex flex-col gap-4">
        {payments.map((p) => (
          <div
            key={p.id}
            className="p-6 rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] flex flex-col gap-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-divider)] pb-3">
              <div>
                <p
                  style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
                  className="font-bold text-[var(--color-text)]"
                >
                  {p.invoice.registration.event.name}
                </p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Invoice <span className="font-semibold text-[var(--color-text)]">{p.invoice.invoiceNumber}</span> —{' '}
                  {p.invoice.registration.participant?.fullName ??
                    p.invoice.registration.team?.name ??
                    'Unknown'}
                </p>
              </div>

              <span
                style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)', color: 'var(--color-primary)' }}
                className="font-bold"
              >
                PKR {p.amount.toString()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-[var(--color-text-muted)]">
              <div>
                <span className="font-semibold text-[var(--color-text)]">Method:</span> {p.method}
              </div>
              {p.referenceNumber && (
                <div>
                  <span className="font-semibold text-[var(--color-text)]">Reference:</span> {p.referenceNumber}
                </div>
              )}
              {p.proofUrl && (
                <div>
                  <span className="font-semibold text-[var(--color-text)]">Proof:</span>{' '}
                  <a
                    href={p.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[var(--color-primary)] hover:underline"
                  >
                    View Attachment ↗
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 border-t border-[var(--color-divider)] pt-4">
              <form action={verifyPaymentAction.bind(null, p.id)}>
                <Button type="submit" variant="success" size="sm">
                  Verify Payment
                </Button>
              </form>
              <form action={rejectPaymentAction.bind(null, p.id)}>
                <Button type="submit" variant="danger" size="sm">
                  Reject Payment
                </Button>
              </form>
            </div>
          </div>
        ))}

        {payments.length === 0 && (
          <p className="text-center py-12 text-[var(--color-text-muted)]">
            No payments awaiting verification.
          </p>
        )}
      </div>
    </div>
  );
}
