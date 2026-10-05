import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminRegistrationsPage() {
  const registrations = await prisma.registration.findMany({
    include: {
      event: true,
      participant: true,
      team: { include: { captain: true, university: true } },
      invoice: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Registrations</h1>

      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-3">Event</th>
              <th className="p-3">Registrant</th>
              <th className="p-3">Type</th>
              <th className="p-3">Status</th>
              <th className="p-3">Invoice</th>
              <th className="p-3">Registered</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.event.name}</td>
                <td className="p-3">
                  {r.participant?.fullName ?? r.team?.name ?? 'Unknown'}
                  {r.team && (
                    <span className="ml-1 text-xs text-slate-500">
                      ({r.team.captain.fullName}{r.team.university ? `, ${r.team.university.name}` : ''})
                    </span>
                  )}
                </td>
                <td className="p-3">{r.team ? 'Team' : 'Individual'}</td>
                <td className="p-3">
                  <span className={`rounded px-2 py-0.5 text-xs ${
                    r.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                    r.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {r.status}
                  </span>
                </td>
                <td className="p-3">
                  {r.invoice ? `${r.invoice.status} (PKR ${r.invoice.amount.toString()})` : '—'}
                </td>
                <td className="p-3">{r.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}

            {registrations.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  No registrations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
