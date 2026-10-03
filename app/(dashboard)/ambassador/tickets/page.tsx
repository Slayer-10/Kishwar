import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getTicketDisplayStatus } from '@/lib/ticket-utils';
import { redirect } from 'next/navigation';

export default async function AmbassadorTicketsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'AMBASSADOR' || !user.participant) {
    redirect('/login');
  }

  const tickets = await prisma.ticket.findMany({
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
      registration: { include: { event: true, team: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">My Tickets</h1>
      <p className="mb-6 text-sm text-slate-500">
        Tickets for events you are personally participating in.
      </p>

      <div className="flex flex-col gap-4">
        {tickets.map((t) => {
          const displayStatus = getTicketDisplayStatus(t);

          return (
            <div key={t.id} className="flex items-center gap-4 rounded border p-4 bg-white">
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
                <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                  displayStatus === 'VALID' ? 'bg-green-100 text-green-700' :
                  displayStatus === 'USED' ? 'bg-slate-200 text-slate-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {displayStatus}
                </span>
              </div>
            </div>
          );
        })}

        {tickets.length === 0 && (
          <p className="text-center text-slate-500">
            No tickets yet. Tickets are issued automatically once your payment is verified.
          </p>
        )}
      </div>
    </div>
  );
}
