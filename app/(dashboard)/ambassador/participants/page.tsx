import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AmbassadorParticipantsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'AMBASSADOR' || !user.ambassador) {
    redirect('/login');
  }

  const ambassadorId = user.ambassador.id;

  // Find all registrations handled by this ambassador
  const registrations = await prisma.registration.findMany({
    where: {
      ambassadorId,
    },
    include: {
      participant: true,
      team: {
        include: {
          captain: true,
          members: {
            include: {
              participant: true,
            },
          },
        },
      },
    },
  });

  // Extract unique participants and count their registrations handled by this ambassador
  const participantMap = new Map<
    string,
    {
      id: string;
      fullName: string;
      email: string;
      phone: string | null;
      cnic: string | null;
      registrationCount: number;
    }
  >();

  for (const reg of registrations) {
    if (reg.participant) {
      const existing = participantMap.get(reg.participant.id);
      if (existing) {
        existing.registrationCount += 1;
      } else {
        participantMap.set(reg.participant.id, {
          id: reg.participant.id,
          fullName: reg.participant.fullName,
          email: reg.participant.email,
          phone: reg.participant.phone,
          cnic: reg.participant.cnic,
          registrationCount: 1,
        });
      }
    }

    if (reg.team) {
      const teamParticipants = [
        reg.team.captain,
        ...reg.team.members.map((m) => m.participant),
      ];

      for (const p of teamParticipants) {
        const existing = participantMap.get(p.id);
        if (existing) {
          existing.registrationCount += 1;
        } else {
          participantMap.set(p.id, {
            id: p.id,
            fullName: p.fullName,
            email: p.email,
            phone: p.phone,
            cnic: p.cnic,
            registrationCount: 1,
          });
        }
      }
    }
  }

  const participants = Array.from(participantMap.values());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Participants</h1>
        <p className="text-sm text-slate-500">
          Participants and team members registered by you.
        </p>
      </div>

      <div className="rounded border bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left font-medium text-slate-600">
              <th className="p-3">Full Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">CNIC Status</th>
              <th className="p-3 text-right">Registrations Handled</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => {
              const hasCnic = Boolean(p.cnic && p.cnic.trim().length > 0);

              return (
                <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-900">{p.fullName}</td>
                  <td className="p-3 text-slate-600">{p.email}</td>
                  <td className="p-3 text-slate-600">{p.phone ?? '—'}</td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                        hasCnic
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      CNIC: {hasCnic ? 'Provided' : 'Missing'}
                    </span>
                  </td>
                  <td className="p-3 text-right font-medium text-slate-900">
                    {p.registrationCount}
                  </td>
                </tr>
              );
            })}

            {participants.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  No participants registered by you yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
