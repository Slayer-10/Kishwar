import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { submitPaymentAction } from '@/app/(dashboard)/participant/actions';
import { redirect } from 'next/navigation';

export default async function AmbassadorPaymentsPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'AMBASSADOR') {
    redirect('/login');
  }

  const invoices = user.participant
    ? await prisma.invoice.findMany({
    where: {
      registration: {
        OR: [
          { participantId: user.participant.id },
          { team: { captainId: user.participant.id } },
          { team: { members: { some: { participantId: user.participant.id } } } },
        ],
      },
    },
    include: {
      registration: { include: { event: true } },
      payments: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
  }) : [];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">My Invoices & Payments</h1>
      <p className="mb-6 text-sm text-slate-500">
        Invoices for events you are personally participating in.
      </p>

      {searchParams.error && (
        <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">{searchParams.error}</div>
      )}

      <div className="flex flex-col gap-6">
        {invoices.map((invoice) => (
          <div key={invoice.id} className="rounded border p-4 bg-white">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="font-semibold">{invoice.registration.event.name}</p>
                <p className="text-sm text-slate-500">Invoice {invoice.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">PKR {invoice.amount.toString()}</p>
                <span className={`rounded px-2 py-0.5 text-xs ${invoice.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {invoice.status}
                </span>
              </div>
            </div>

            {invoice.payments.length > 0 && (
              <div className="mb-3 flex flex-col gap-1 text-sm">
                {invoice.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded bg-slate-50 p-2">
                    <span>{p.method}{p.referenceNumber ? ` — ${p.referenceNumber}` : ''}</span>
                    <span className={`rounded px-2 py-0.5 text-xs ${
                      p.verificationStatus === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                      p.verificationStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {p.verificationStatus}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {invoice.status !== 'PAID' && (
              <form action={submitPaymentAction} className="flex flex-wrap items-end gap-3 border-t pt-3">
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Payment Method</label>
                  <input name="method" type="text" placeholder="e.g. Bank Transfer" required className="rounded border p-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Reference Number</label>
                  <input name="referenceNumber" type="text" placeholder="Transaction ID" className="rounded border p-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Proof URL</label>
                  <input name="proofUrl" type="text" placeholder="Link to screenshot" className="rounded border p-2 text-sm" />
                </div>
                <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
                  Submit Payment
                </button>
              </form>
            )}
          </div>
        ))}

        {invoices.length === 0 && (
          <p className="text-center text-slate-500">No invoices yet for your personal event registrations.</p>
        )}
      </div>
    </div>
  );
}
