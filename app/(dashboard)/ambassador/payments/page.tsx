import React from 'react';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { submitCampusPaymentAction } from '@/app/(dashboard)/ambassador/actions';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

export default async function AmbassadorPaymentsPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'AMBASSADOR' || !user.ambassador) {
    redirect('/login');
  }

  const ambassador = await prisma.ambassador.findUnique({
    where: { id: user.ambassador.id },
    include: { university: true },
  });

  if (!ambassador) {
    redirect('/login');
  }

  const campusScopeWhere = {
    OR: [
      { ambassadorId: ambassador.id },
      { team: { ambassadorId: ambassador.id } },
      { participant: { universityId: ambassador.universityId } },
      { team: { universityId: ambassador.universityId } },
    ],
  };

  // Fetch unpaid campus invoices that are not attached to a CampusPayment
  const unpaidInvoices = await prisma.invoice.findMany({
    where: {
      status: 'PENDING',
      campusPaymentId: null,
      registration: campusScopeWhere,
    },
    include: {
      registration: {
        include: {
          participant: true,
          team: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch campus payments history
  const campusPayments = await prisma.campusPayment.findMany({
    where: { ambassadorId: ambassador.id },
    include: {
      invoices: {
        include: {
          registration: {
            include: {
              participant: true,
              team: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const pendingPayment = campusPayments.find(
    (cp) => cp.verificationStatus === 'SUBMITTED'
  );

  const totalUnpaidAmount = unpaidInvoices.reduce(
    (sum, inv) => sum + Number(inv.amount),
    0
  );

  const getRegistrantName = (inv: (typeof unpaidInvoices)[number]) =>
    inv.registration.team?.name ??
    inv.registration.participant?.fullName ??
    'Participant';

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
          Campus Payments
        </h1>
        <div
          className="mt-2 h-[4px] w-[56px] rounded-[2px]"
          style={{ backgroundColor: 'var(--color-primary)' }}
        />
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Manage and pay the total bill for {ambassador.university.name} in one combined campus payment.
        </p>
      </div>

      {searchParams.error && <div className="form-error">{searchParams.error}</div>}

      {/* Pending Banner if a CampusPayment is waiting for verification */}
      {pendingPayment && (
        <div className="p-5 rounded-[var(--radius-lg)] bg-amber-500/10 border-l-4 border-amber-500 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-amber-900 uppercase">
              Payment submitted, waiting for admin verification
            </h2>
            <StatusBadge status="SUBMITTED" />
          </div>
          <p className="text-sm text-amber-800">
            Amount: <span className="font-bold">Rs. {Number(pendingPayment.totalAmount).toFixed(2)}</span>
            {pendingPayment.method ? ` via ${pendingPayment.method}` : ''}
            {pendingPayment.referenceNumber ? ` (Ref: ${pendingPayment.referenceNumber})` : ''}
          </p>
          <p className="text-xs text-amber-700">
            Submitted on {pendingPayment.createdAt.toLocaleDateString()} at{' '}
            {pendingPayment.createdAt.toLocaleTimeString()}.
          </p>
        </div>
      )}

      {/* Unpaid Invoices & Campus Payment Form */}
      <section className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] flex flex-col gap-5 border-t-4 border-t-[var(--color-primary)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-divider)] pb-3">
          <h2
            style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
            className="font-bold uppercase text-[var(--color-text)]"
          >
            {pendingPayment ? 'New Unpaid Invoices' : 'Unpaid Campus Invoices'} ({unpaidInvoices.length})
          </h2>
        </div>

        {unpaidInvoices.length > 0 ? (
          <div className="flex flex-col gap-5">
            <ul className="flex flex-col divide-y divide-[var(--color-divider)] text-sm">
              {unpaidInvoices.map((inv) => (
                <li key={inv.id} className="py-3 flex items-center justify-between gap-2">
                  <span className="font-semibold text-[var(--color-text)]">
                    {getRegistrantName(inv)}
                  </span>
                  <span className="font-bold text-[var(--color-primary)]">
                    Rs. {Number(inv.amount).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>

            {/* Total Row */}
            <div className="p-4 rounded-[var(--radius-sm)] bg-[var(--color-background)] flex items-center justify-between font-bold text-base border border-[var(--color-divider)]">
              <span className="uppercase font-heading tracking-wide">
                Total campus bill:
              </span>
              <span className="text-[var(--color-primary)] text-lg">
                Rs. {totalUnpaidAmount.toFixed(2)}
              </span>
            </div>

            {/* Payment Form */}
            <form action={submitCampusPaymentAction} className="flex flex-col gap-4 pt-2">
              <h3 className="text-sm font-bold uppercase text-[var(--color-text)]">
                Submit Combined Campus Payment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Payment Method</label>
                  <input
                    name="method"
                    type="text"
                    placeholder="e.g. EasyPaisa / JazzCash / Bank"
                    required
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Reference Number</label>
                  <input
                    name="referenceNumber"
                    type="text"
                    placeholder="Transaction ID / Ref #"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Proof URL</label>
                  <input
                    name="proofUrl"
                    type="text"
                    placeholder="Screenshot link (optional)"
                    className="form-input"
                  />
                </div>
              </div>

              <Button type="submit" variant="primary" className="self-start mt-2">
                Submit campus payment (Rs. {totalUnpaidAmount.toFixed(2)})
              </Button>
            </form>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)] py-4">
            No unpaid invoices for your campus.
          </p>
        )}
      </section>

      {/* Campus Payment History */}
      <section className="flex flex-col gap-4">
        <h2
          style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
          className="font-bold uppercase text-[var(--color-text)]"
        >
          Campus Payment History
        </h2>

        {campusPayments.map((cp) => (
          <div
            key={cp.id}
            className="p-5 rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] flex flex-col gap-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-divider)] pb-2">
              <div>
                <span className="font-bold text-base text-[var(--color-primary)]">
                  Rs. {Number(cp.totalAmount).toFixed(2)}
                </span>
                <span className="text-xs text-[var(--color-text-muted)] ml-3">
                  Method: {cp.method} {cp.referenceNumber ? `(Ref: ${cp.referenceNumber})` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={cp.verificationStatus} />
                <span className="text-xs text-[var(--color-text-muted)]">
                  {cp.createdAt.toLocaleDateString()}
                </span>
              </div>
            </div>

            {cp.proofUrl && (
              <a
                href={cp.proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
              >
                View Payment Proof ↗
              </a>
            )}
          </div>
        ))}

        {campusPayments.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">No past campus payments.</p>
        )}
      </section>
    </div>
  );
}
