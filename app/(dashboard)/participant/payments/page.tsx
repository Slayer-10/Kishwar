import React from 'react';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { submitPaymentAction } from '@/app/(dashboard)/participant/actions';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';

export default async function ParticipantPaymentsPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const user = await getCurrentUser();

  const invoices = await prisma.invoice.findMany({
    where: { registration: { participantId: user!.participant!.id } },
    include: {
      registration: { include: { event: true } },
      payments: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const me = await prisma.participant.findUnique({
    where: { id: user!.participant!.id },
    include: {
      university: { include: { ambassadors: { include: { user: true } } } },
    },
  });
  const campusAmbassador = me?.university?.ambassadors[0] ?? null;

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
          Invoices & Payments
        </h1>
        <div
          className="mt-2 h-[4px] w-[56px] rounded-[2px]"
          style={{ backgroundColor: 'var(--color-primary)' }}
        />
      </div>

      {searchParams.error && <div className="form-error">{searchParams.error}</div>}

      <div className="flex flex-col gap-6">
        {invoices.map((invoice) => (
          <div
            key={invoice.id}
            className="p-6 rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] flex flex-col gap-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-divider)] pb-3">
              <div>
                <h2
                  style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
                  className="font-bold text-[var(--color-text)] uppercase tracking-wide"
                >
                  {invoice.registration.event.name}
                </h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Invoice <span className="font-semibold text-[var(--color-text)]">{invoice.invoiceNumber}</span>
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)', color: 'var(--color-primary)' }}
                  className="font-bold"
                >
                  PKR {invoice.amount.toString()}
                </span>
                <StatusBadge status={invoice.status} />
              </div>
            </div>

            {invoice.payments.length > 0 && (
              <div className="flex flex-col gap-2 p-3 rounded-[var(--radius-sm)] bg-[var(--color-background)]">
                <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">
                  Payment History
                </span>
                {invoice.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm py-1">
                    <span>
                      {p.method}
                      {p.referenceNumber ? ` — ${p.referenceNumber}` : ''}
                    </span>
                    <StatusBadge status={p.verificationStatus} />
                  </div>
                ))}
              </div>
            )}

            {invoice.status !== 'PAID' && campusAmbassador && (
              <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--color-background)] text-sm text-[var(--color-text-muted)] border-t border-[var(--color-divider)]">
                Payment for your university is made in one combined payment by your campus Ambassador
                ({campusAmbassador.user.email}). Please hand your fee to them.
              </div>
            )}

            {invoice.status !== 'PAID' && !campusAmbassador && (
              <form action={submitPaymentAction} className="flex flex-col gap-4 border-t border-[var(--color-divider)] pt-4">
                <input type="hidden" name="invoiceId" value={invoice.id} />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">Payment Method</label>
                    <input
                      name="method"
                      type="text"
                      placeholder="e.g. Bank Transfer"
                      required
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Reference Number</label>
                    <input
                      name="referenceNumber"
                      type="text"
                      placeholder="Transaction ID"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Proof URL</label>
                    <input
                      name="proofUrl"
                      type="text"
                      placeholder="Link to screenshot"
                      className="form-input"
                    />
                  </div>
                </div>

                <Button type="submit" variant="primary" className="self-start mt-2">
                  Submit Payment
                </Button>
              </form>
            )}
          </div>
        ))}

        {invoices.length === 0 && (
          <p className="text-center py-12 text-[var(--color-text-muted)]">
            No invoices yet. Register for an event to get one.
          </p>
        )}
      </div>
    </div>
  );
}
