import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export default async function AmbassadorHomePage() {
  const user = await getCurrentUser();

  const ambassador = await prisma.ambassador.findUnique({
    where: { id: user!.ambassador!.id },
    include: { university: true },
  });

  const [teams, individualRegistrations, myParticipation] = await Promise.all([
    prisma.team.findMany({
      where: {
        ambassadorId: user!.ambassador!.id,
      },
      include: {
        event: true,
        captain: true,
        members: {
          include: {
            participant: true,
          },
        },
        registrations: {
          include: {
            invoice: {
              include: {
                payments: {
                  orderBy: {
                    createdAt: 'desc',
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),

    prisma.registration.findMany({
      where: {
        ambassadorId: user!.ambassador!.id,
        teamId: null,
      },
      include: {
        event: true,
        participant: true,
        invoice: {
          include: {
            payments: {
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),

    prisma.registration.findMany({
      where: {
        OR: [
          { participantId: user!.participant!.id },
          { team: { captainId: user!.participant!.id } },
          { team: { members: { some: { participantId: user!.participant!.id } } } },
        ],
      },
      include: {
        event: true,
        ambassador: {
          include: {
            user: true,
            university: true,
          },
        },
        invoice: {
          include: {
            payments: {
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="mb-1 text-2xl font-bold">Ambassador Dashboard</h1>
        <p className="text-sm text-slate-500">{ambassador?.university.name} ({ambassador?.ambassadorCode})</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded border p-4">
          <p className="text-sm text-slate-500">Individual Registrations Handled</p>
          <p className="mt-1 text-2xl font-bold">
            {individualRegistrations.length}
          </p>
        </div>

        <div className="rounded border p-4">
          <p className="text-sm text-slate-500">Team Registrations Handled</p>
          <p className="mt-1 text-2xl font-bold">
            {teams.length}
          </p>
        </div>

        <div className="rounded border p-4">
          <p className="text-sm text-slate-500">My Own Participations</p>
          <p className="mt-1 text-2xl font-bold">
            {myParticipation.length}
          </p>
        </div>
      </div>

      {/* My Personal Participation */}
      <section className="rounded-lg border border-blue-200 bg-blue-50/40 p-6">
        <h2 className="mb-2 text-xl font-bold text-slate-900">My Participation</h2>
        <p className="mb-4 text-sm text-slate-500">
          Events you are personally participating in as a participant or team member.
        </p>

        <div className="flex flex-col gap-4">
          {myParticipation.map((reg) => (
            <div key={reg.id} className="rounded border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <Link href={`/events/${reg.eventId}`} className="font-semibold text-blue-600 underline">
                    {reg.event.name}
                  </Link>
                  <p className="text-sm text-slate-500">
                    Event Date: {new Date(reg.event.eventDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p>Status: <span className="font-medium">{reg.status}</span></p>
                  {reg.invoice && (
                    <p>Invoice: <span className="font-medium">{reg.invoice.status} (PKR {reg.invoice.amount.toString()})</span></p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {myParticipation.length === 0 && (
            <p className="text-sm text-slate-500">You have not registered for any events personally yet.</p>
          )}
        </div>
      </section>

      {/* Registrations Handled by Ambassador */}
      <section>
        <h2 className="mb-4 text-xl font-bold">Individual Registrations Handled ({individualRegistrations.length})</h2>

        <div className="flex flex-col gap-4">
          {individualRegistrations.map((reg) => {
            const invoice = reg.invoice;
            const latestPayment = invoice?.payments[0];

            return (
              <div key={reg.id} className="rounded border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{reg.participant?.fullName}</p>
                    <p className="text-sm text-slate-500">{reg.participant?.email} — {reg.event.name}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>Status: <span className="font-medium">{reg.status}</span></p>
                    {invoice && <p>Invoice: <span className="font-medium">{invoice.status} (PKR {invoice.amount.toString()})</span></p>}
                  </div>
                </div>

                {latestPayment && (
                  <p className="mt-2 border-t pt-2 text-xs text-slate-500">
                    Latest payment: {latestPayment.method} — {latestPayment.verificationStatus}
                  </p>
                )}
              </div>
            );
          })}

          {individualRegistrations.length === 0 && (
            <p className="text-sm text-slate-500">No individual registrations handled by you yet.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Team Registrations Handled ({teams.length})</h2>

        <div className="flex flex-col gap-6">
          {teams.map((team) => {
            const registration = team.registrations[0];
            const invoice = registration?.invoice;
            const latestPayment = invoice?.payments[0];

            return (
              <div key={team.id} className="rounded border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{team.name}</p>
                    <p className="text-sm text-slate-500">{team.event.name}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>Registration: <span className="font-medium">{registration?.status ?? 'N/A'}</span></p>
                    {invoice && (
                      <p>Invoice: <span className="font-medium">{invoice.status}</span></p>
                    )}
                  </div>
                </div>

                <div className="mt-3 border-t pt-3 text-sm">
                  <p className="mb-1 font-medium text-slate-600">Captain</p>
                  <p>{team.captain.fullName} — {team.captain.email}</p>

                  {team.members.length > 0 && (
                    <>
                      <p className="mb-1 mt-3 font-medium text-slate-600">Members</p>
                      <ul className="list-disc pl-5">
                        {team.members
                          .filter((m) => m.participantId !== team.captainId)
                          .map((m) => (
                            <li key={m.id}>{m.participant.fullName} — {m.participant.email}</li>
                          ))}
                      </ul>
                    </>
                  )}
                </div>

                {latestPayment && (
                  <p className="mt-3 text-sm text-slate-500">
                    Latest payment: {latestPayment.method} — {latestPayment.verificationStatus}
                  </p>
                )}
              </div>
            );
          })}

          {teams.length === 0 && (
            <p className="text-center text-slate-500">No teams registered by you yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
