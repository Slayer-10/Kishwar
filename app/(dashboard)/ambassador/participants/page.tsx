import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export default async function AmbassadorParticipantsPage() {
  const user = await getCurrentUser();

  const ambassador = await prisma.ambassador.findUnique({
    where: { userId: user!.id },
    include: { university: true },
  });

  if (!ambassador) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Participants</h1>
        <p className="mt-2 text-slate-500">No ambassador profile found for this account.</p>
      </div>
    );
  }

  const teams = await prisma.team.findMany({
    where: { universityId: ambassador.universityId },
    include: {
      event: true,
      captain: true,
      members: { include: { participant: { include: { user: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Participants</h1>
      <p className="mb-6 text-sm text-slate-500">{ambassador.university.name}</p>

      <div className="flex flex-col gap-4">
        {teams.map((t) => (
          <div key={t.id} className="rounded border p-4">
            <p className="font-semibold">{t.name} — {t.event.name}</p>
            <div className="mt-2 flex flex-col gap-1 text-sm text-slate-600">
              <p>Captain: {t.captain.fullName} ({t.captain.email})</p>
              {t.members.map((m) => (
                <p key={m.id}>
                  {m.participant.fullName} ({m.participant.user.email})
                </p>
              ))}
            </div>
          </div>
        ))}

        {teams.length === 0 && (
          <p className="text-center text-slate-500">No participants from your university yet.</p>
        )}
      </div>
    </div>
  );
}
