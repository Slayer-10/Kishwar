import { prisma } from '@/lib/prisma';
import { verifyPaymentAction, rejectPaymentAction } from '@/app/(dashboard)/admin/actions';

export const dynamic = 'force-dynamic';

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
    <div>
      <h1 className="mb-6 text-2xl font-bold">Payment Verification</h1>

      <div className="flex flex-col gap-4">
        {payments.map((p) => (
          <div key={p.id} className="rounded border p-4">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="font-semibold">{p.invoice.registration.event.name}</p>
                <p className="text-sm text-slate-500">
                  Invoice {p.invoice.invoiceNumber} — {p.invoice.registration.participant?.fullName ?? p.invoice.registration.team?.name ?? 'Unknown'}
                </p>
              </div>
              <p className="font-semibold">PKR {p.amount.toString()}</p>
            </div>

            <div className="mb-3 text-sm text-slate-600">
              <p>Method: {p.method}</p>
              {p.referenceNumber && <p>Reference: {p.referenceNumber}</p>}
              {p.proofUrl && (
                <p>
                  Proof:{' '}
                  <a href={p.proofUrl} target="_blank" className="text-blue-600 underline">
                    {p.proofUrl}
                  </a>
                </p>
              )}
            </div>

            <div className="flex gap-2 border-t pt-3">
              <form action={verifyPaymentAction.bind(null, p.id)}>
                <button type="submit" className="rounded bg-green-600 px-4 py-2 text-sm text-white">
                  Verify
                </button>
              </form>
              <form action={rejectPaymentAction.bind(null, p.id)}>
                <button type="submit" className="rounded bg-red-600 px-4 py-2 text-sm text-white">
                  Reject
                </button>
              </form>
            </div>
          </div>
        ))}

        {payments.length === 0 && (
          <p className="text-center text-slate-500">No payments awaiting verification.</p>
        )}
      </div>
    </div>
  );
}
