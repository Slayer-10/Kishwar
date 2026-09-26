import { prisma } from '@/lib/prisma';

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
    <div>
      <h1 className="mb-6 text-2xl font-bold">Payments</h1>
      <p className="mb-4 text-sm text-slate-500">
        Read-only view. Verifying or rejecting a payment is done by an admin under Admin → Payments.
      </p>

      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-3">Event</th>
              <th className="p-3">Registrant</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Method</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{p.invoice.registration.event.name}</td>
                <td className="p-3">
                  {p.invoice.registration.participant?.fullName ?? p.invoice.registration.team?.name ?? 'Unknown'}
                </td>
                <td className="p-3">PKR {p.amount.toString()}</td>
                <td className="p-3">{p.method}</td>
                <td className="p-3">
                  <span className={`rounded px-2 py-0.5 text-xs ${
                    p.verificationStatus === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                    p.verificationStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {p.verificationStatus}
                  </span>
                </td>
              </tr>
            ))}

            {payments.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
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
