import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export default async function AmbassadorHomePage() {
  const user = await getCurrentUser();

  const ambassador = await prisma.ambassador.findUnique({
    where: { id: user!.ambassador!.id },
    include: { university: true },
  });

  const teams = await prisma.team.findMany({
    where: { ambassadorId: user!.ambassador!.id },
    include: {
      event: true,
      captain: true,
      members: { include: { participant: true } },
      registrations: { include: { invoice: { include: { payments: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">My Teams</h1>
      <p className="mb-6 text-sm text-slate-500">{ambassador?.university.name}</p>

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
          <p className="text-center text-slate-500">No teams registered from your university yet.</p>
        )}
      </div>
    </div>
  );
}
