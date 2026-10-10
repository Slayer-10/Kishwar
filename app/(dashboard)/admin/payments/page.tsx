import React from 'react';
import { prisma } from '@/lib/prisma';
import {
  verifyPaymentAction,
  rejectPaymentAction,
  verifyBatchAction,
  rejectBatchAction,
  verifyCampusPaymentAction,
  rejectCampusPaymentAction,
} from '@/app/(dashboard)/admin/actions';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPage() {
  const [payments, campusPayments] = await Promise.all([
    prisma.payment.findMany({
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
    }),

    prisma.campusPayment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        ambassador: {
          include: {
            user: true,
            university: true,
          },
        },
        invoices: {
          include: {
            registration: {
              include: { event: true, participant: true, team: true },
            },
          },
        },
      },
    }),
  ]);

  const groupMap = new Map<string, typeof payments>();
  for (const p of payments) {
    const key = p.batchId ?? p.id;
    const list = groupMap.get(key);
    if (list) list.push(p);
    else groupMap.set(key, [p]);
  }
  const groups = Array.from(groupMap.values());

  return (
    <div className="flex flex-col gap-8">
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

      {/* SECTION 1: Campus Payments */}
      <section className="flex flex-col gap-4">
        <h2
          style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
          className="font-bold uppercase text-[var(--color-text)]"
        >
          Campus Payments
        </h2>

        {campusPayments.map((cp) => (
          <div
            key={cp.id}
            className="p-6 rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] flex flex-col gap-4 border-l-4 border-l-[var(--color-secondary)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-divider)] pb-3">
              <div>
                <p
                  style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
                  className="font-bold text-[var(--color-text)]"
                >
                  {cp.ambassador.university.name} — Combined Campus Bill
                </p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Ambassador:{' '}
                  <span className="font-semibold text-[var(--color-text)]">
                    {cp.ambassador.user.email}
                  </span>{' '}
                  ({cp.ambassador.ambassadorCode}) &bull; Invoices: {cp.invoices.length}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--fs-title2)',
                    color: 'var(--color-primary)',
                  }}
                  className="font-bold"
                >
                  Rs. {Number(cp.totalAmount).toFixed(2)}
                </span>
                <StatusBadge status={cp.verificationStatus} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-[var(--color-text-muted)]">
              <div>
                <span className="font-semibold text-[var(--color-text)]">Method:</span> {cp.method}
              </div>
              {cp.referenceNumber && (
                <div>
                  <span className="font-semibold text-[var(--color-text)]">Reference:</span>{' '}
                  {cp.referenceNumber}
                </div>
              )}
              {cp.proofUrl && (
                <div>
                  <span className="font-semibold text-[var(--color-text)]">Proof:</span>{' '}
                  <a
                    href={cp.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[var(--color-primary)] hover:underline"
                  >
                    View Proof Attachment ↗
                  </a>
                </div>
              )}
            </div>

            {cp.verificationStatus === 'SUBMITTED' && (
              <div className="flex items-center gap-3 border-t border-[var(--color-divider)] pt-4">
                <form action={verifyCampusPaymentAction.bind(null, cp.id)}>
                  <Button type="submit" variant="success" size="sm">
                    Verify Campus Payment
                  </Button>
                </form>
                <form action={rejectCampusPaymentAction.bind(null, cp.id)}>
                  <Button type="submit" variant="danger" size="sm">
                    Reject Campus Payment
                  </Button>
                </form>
              </div>
            )}
          </div>
        ))}

        {campusPayments.length === 0 && (
          <p className="text-center py-6 text-[var(--color-text-muted)]">
            No campus payments submitted.
          </p>
        )}
      </section>

      {/* SECTION 2: Single / Direct Payments */}
      <section className="flex flex-col gap-4">
        <h2
          style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
          className="font-bold uppercase text-[var(--color-text)]"
        >
          Direct &amp; Individual Payments
        </h2>

        {groups.map((group) => {
          const first = group[0];
          const isBatch = Boolean(first.batchId);
          const total = group.reduce((sum, p) => sum + Number(p.amount), 0);

          return (
            <div
              key={first.batchId ?? first.id}
              className="p-6 rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] flex flex-col gap-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-divider)] pb-3">
                <div>
                  <p
                    style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
                    className="font-bold text-[var(--color-text)]"
                  >
                    {isBatch
                      ? `Combined payment — ${group.length} invoice${group.length === 1 ? '' : 's'}`
                      : first.invoice.registration.event.name}
                  </p>
                  {!isBatch && (
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                      Invoice{' '}
                      <span className="font-semibold text-[var(--color-text)]">
                        {first.invoice.invoiceNumber}
                      </span>{' '}
                      —{' '}
                      {first.invoice.registration.participant?.fullName ??
                        first.invoice.registration.team?.name ??
                        'Unknown'}
                    </p>
                  )}
                </div>

                <span
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--fs-title2)',
                    color: 'var(--color-primary)',
                  }}
                  className="font-bold"
                >
                  PKR {total.toFixed(2)}
                </span>
              </div>

              {isBatch && (
                <ul className="flex flex-col gap-1 text-sm p-3 rounded-[var(--radius-sm)] bg-[var(--color-background)]">
                  {group.map((p) => (
                    <li key={p.id} className="flex justify-between gap-3">
                      <span>
                        {p.invoice.registration.event.name} —{' '}
                        {p.invoice.registration.participant?.fullName ??
                          p.invoice.registration.team?.name ??
                          'Unknown'}{' '}
                        <span className="text-[var(--color-text-muted)]">
                          ({p.invoice.invoiceNumber})
                        </span>
                      </span>
                      <span className="font-semibold">PKR {p.amount.toString()}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-[var(--color-text-muted)]">
                <div>
                  <span className="font-semibold text-[var(--color-text)]">Method:</span> {first.method}
                </div>
                {first.referenceNumber && (
                  <div>
                    <span className="font-semibold text-[var(--color-text)]">Reference:</span>{' '}
                    {first.referenceNumber}
                  </div>
                )}
                {first.proofUrl && (
                  <div>
                    <span className="font-semibold text-[var(--color-text)]">Proof:</span>{' '}
                    <a
                      href={first.proofUrl}
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
                <form
                  action={
                    isBatch
                      ? verifyBatchAction.bind(null, first.batchId as string)
                      : verifyPaymentAction.bind(null, first.id)
                  }
                >
                  <Button type="submit" variant="success" size="sm">
                    {isBatch ? 'Verify All' : 'Verify Payment'}
                  </Button>
                </form>
                <form
                  action={
                    isBatch
                      ? rejectBatchAction.bind(null, first.batchId as string)
                      : rejectPaymentAction.bind(null, first.id)
                  }
                >
                  <Button type="submit" variant="danger" size="sm">
                    {isBatch ? 'Reject All' : 'Reject Payment'}
                  </Button>
                </form>
              </div>
            </div>
          );
        })}

        {groups.length === 0 && (
          <p className="text-center py-6 text-[var(--color-text-muted)]">
            No direct payments awaiting verification.
          </p>
        )}
      </section>
    </div>
  );
}
