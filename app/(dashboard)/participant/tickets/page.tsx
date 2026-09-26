import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export default async function ParticipantTicketsPage() {
  const user = await getCurrentUser();

  const tickets = await prisma.ticket.findMany({
    where: {
      registration: {
        OR: [
          { participantId: user!.participant!.id },
          { team: { captainId: user!.participant!.id } },
          { team: { members: { some: { participantId: user!.participant!.id } } } },
        ],
      },
    },
    include: {
      registration: { include: { event: true, team: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">My Tickets</h1>

      <div className="flex flex-col gap-4">
        {tickets.map((t) => (
          <div key={t.id} className="flex items-center gap-4 rounded border p-4">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(t.qrData)}`}
              alt="Ticket QR code"
              className="h-24 w-24 shrink-0"
            />
            <div>
              <p className="font-semibold">{t.registration.event.name}</p>
              {t.registration.team && (
                <p className="text-sm text-slate-500">Team: {t.registration.team.name}</p>
              )}
              <p className="mt-1 font-mono text-sm">{t.ticketCode}</p>
              <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs ${
                t.status === 'VALID' ? 'bg-green-100 text-green-700' :
                t.status === 'USED' ? 'bg-slate-200 text-slate-700' :
                'bg-red-100 text-red-700'
              }`}>
                {t.status}
              </span>
            </div>
          </div>
        ))}

        {tickets.length === 0 && (
          <p className="text-center text-slate-500">
            No tickets yet. Tickets are issued automatically once your payment is verified.
          </p>
        )}
      </div>
    </div>
  );
}
