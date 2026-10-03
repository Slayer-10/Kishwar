import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export default async function AmbassadorHomePage() {
  const user = await getCurrentUser();

  const ambassador = await prisma.ambassador.findUnique({
    where: { id: user!.ambassador!.id },
    include: { university: true },
  });

  const [teams, individualRegistrations] = await Promise.all([
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
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="mb-1 text-2xl font-bold">Ambassador Dashboard</h1>
        <p className="text-sm text-slate-500">{ambassador?.university.name} ({ambassador?.ambassadorCode})</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded border p-4">
          <p className="text-sm text-slate-500">Individual Registrations</p>
          <p className="mt-1 text-2xl font-bold">
            {individualRegistrations.length}
          </p>
        </div>

        <div className="rounded border p-4">
          <p className="text-sm text-slate-500">Team Registrations</p>
          <p className="mt-1 text-2xl font-bold">
            {teams.length}
          </p>
        </div>

        <div className="rounded border p-4">
          <p className="text-sm text-slate-500">Total Registrations</p>
          <p className="mt-1 text-2xl font-bold">
            {individualRegistrations.length + teams.length}
          </p>
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-xl font-bold">Individual Registrations ({individualRegistrations.length})</h2>

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
        <h2 className="mb-4 text-xl font-bold">Team Registrations ({teams.length})</h2>

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
