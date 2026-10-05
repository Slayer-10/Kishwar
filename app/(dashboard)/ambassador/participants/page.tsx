import React from 'react';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default async function AmbassadorParticipantsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'AMBASSADOR' || !user.ambassador) {
    redirect('/login');
  }

  const ambassadorId = user.ambassador.id;

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col">
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--fs-title1)',
            lineHeight: 'var(--lh-title1)',
            color: 'var(--color-text)',
          }}
          className="font-bold uppercase tracking-tight"
        >
          Participants
        </h1>
        <div
          className="mt-2 h-[4px] w-[56px] rounded-[2px]"
          style={{ backgroundColor: 'var(--color-primary)' }}
        />
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Participants and team members registered by you.
        </p>
      </div>

      <div className="w-full overflow-x-auto rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr
              style={{ backgroundColor: 'var(--color-secondary)', color: '#FFFFFF' }}
              className="font-heading text-xs uppercase tracking-wider h-[48px]"
            >
              <th className="px-5 py-3 font-semibold">Full Name</th>
              <th className="px-5 py-3 font-semibold">Email</th>
              <th className="px-5 py-3 font-semibold">Phone</th>
              <th className="px-5 py-3 font-semibold">CNIC Status</th>
              <th className="px-5 py-3 font-semibold text-right">Registrations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-divider)]">
            {participants.map((p) => {
              const hasCnic = Boolean(p.cnic && p.cnic.trim().length > 0);

              return (
                <tr
                  key={p.id}
                  className="h-[56px] transition-colors hover:bg-[rgba(106,172,220,0.08)]"
                >
                  <td className="px-5 py-3 font-semibold text-[var(--color-text)]">{p.fullName}</td>
                  <td className="px-5 py-3 text-[var(--color-text-muted)]">{p.email}</td>
                  <td className="px-5 py-3 text-[var(--color-text-muted)]">{p.phone ?? '—'}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={hasCnic ? 'VALID' : 'INVALID'} />
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-[var(--color-primary)]">
                    {p.registrationCount}
                  </td>
                </tr>
              );
            })}

            {participants.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-[var(--color-text-muted)]">
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
