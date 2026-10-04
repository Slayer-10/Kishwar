import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AmbassadorMyRegistrationsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'AMBASSADOR') {
    redirect('/login');
  }

  const participant = user.participant;

  const registrations = participant
    ? await prisma.registration.findMany({
        where: {
          OR: [
            { participantId: participant.id },
            { team: { captainId: participant.id } },
            { team: { members: { some: { participantId: participant.id } } } },
          ],
        },
        include: {
          event: true,
          team: {
            include: {
              members: {
                include: {
                  participant: true,
                },
              },
            },
          },
          invoice: true,
          ticket: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    : [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Personal Registrations</h1>
          <p className="text-sm text-slate-500">
            Competitions where you are personally participating.
          </p>
        </div>
        <Link
          href="/events"
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Browse Events
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {registrations.map((reg) => (
          <div key={reg.id} className="rounded border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-amber-600 font-semibold">
                  {reg.event.category ?? 'Event'}
                </span>
                <h2 className="text-lg font-bold text-slate-900">{reg.event.name}</h2>
                {reg.team && (
                  <p className="text-sm text-slate-600">Team: {reg.team.name}</p>
                )}
              </div>
              <span className={`rounded px-2.5 py-1 text-xs font-semibold ${
                reg.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                reg.status === 'PAID' ? 'bg-blue-100 text-blue-800' :
                reg.status === 'INVOICED' ? 'bg-amber-100 text-amber-800' :
                'bg-slate-100 text-slate-800'
              }`}>
                {reg.status}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between border-t pt-4 text-sm gap-2">
              <div>
                <span className="text-slate-500">Registration Fee: </span>
                <span className="font-semibold">PKR {reg.event.registrationFee.toString()}</span>
              </div>

              <div className="flex items-center gap-3">
                {reg.invoice && reg.invoice.status !== 'PAID' && (
                  <Link
                    href="/ambassador/payments"
                    className="rounded border border-amber-600 px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50"
                  >
                    Pay Invoice ({reg.invoice.invoiceNumber})
                  </Link>
                )}

                {reg.ticket && (
                  <Link
                    href="/ambassador/tickets"
                    className="rounded bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800"
                  >
                    View Ticket
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}

        {registrations.length === 0 && (
          <div className="rounded border border-dashed p-8 text-center text-slate-500">
            <p>You have not registered for any personal event competitions yet.</p>
            <Link
              href="/events"
              className="mt-3 inline-block rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Browse Open Events
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
