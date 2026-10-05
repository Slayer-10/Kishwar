import { prisma } from '@/lib/prisma';
import { checkInTicketAction } from '@/app/(dashboard)/fdo/actions';

export const dynamic = 'force-dynamic';

export default async function FdoCheckinPage({
  searchParams,
}: {
  searchParams: { code?: string; error?: string; success?: string };
}) {
  const ticket = searchParams.code
    ? await prisma.ticket.findUnique({
        where: { ticketCode: searchParams.code.toUpperCase() },
        include: {
          registration: {
            include: { event: true, participant: true, team: { include: { captain: true } } },
          },
        },
      })
    : null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Ticket Check-In</h1>

      <form action={checkInTicketAction} className="mb-6 flex items-end gap-3 rounded border p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Ticket Code</label>
          <input
            name="ticketCode"
            type="text"
            required
            placeholder="TCK-XXXXXXXX"
            defaultValue={searchParams.code ?? ''}
            className="rounded border p-2 text-sm font-mono uppercase"
          />
        </div>
        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
          Look Up / Check In
        </button>
      </form>

      {searchParams.error && (
        <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">{searchParams.error}</div>
      )}
      {searchParams.success && (
        <div className="mb-4 rounded bg-green-100 p-3 text-sm text-green-700">{searchParams.success}</div>
      )}

      {ticket && (
        <div className="rounded border p-4">
          <p className="font-semibold">{ticket.registration.event.name}</p>
          <p className="mt-1 text-sm text-slate-600">
            {ticket.registration.participant?.fullName ??
              `${ticket.registration.team?.name} (Captain: ${ticket.registration.team?.captain.fullName})`}
          </p>
          <p className="mt-2 font-mono text-sm">{ticket.ticketCode}</p>
          <span className={`mt-2 inline-block rounded px-2 py-0.5 text-xs ${
            ticket.status === 'VALID' ? 'bg-green-100 text-green-700' :
            ticket.status === 'USED' ? 'bg-slate-200 text-slate-700' :
            'bg-red-100 text-red-700'
          }`}>
            {ticket.status}
          </span>
        </div>
      )}
    </div>
  );
}
