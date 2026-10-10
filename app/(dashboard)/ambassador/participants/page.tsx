import React from 'react';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
  AmbassadorParticipantsTable,
  SerializedRegistration,
  SerializedMember,
} from '@/components/dashboard/AmbassadorParticipantsTable';

export const dynamic = 'force-dynamic';

export default async function AmbassadorParticipantsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'AMBASSADOR' || !user.ambassador) {
    redirect('/login');
  }

  const amb = user.ambassador;

  const registrations = await prisma.registration.findMany({
    where: {
      OR: [
        { ambassadorId: amb.id },
        { team: { ambassadorId: amb.id } },
        { participant: { universityId: amb.universityId } },
        { team: { universityId: amb.universityId } },
      ],
    },
    include: {
      event: { select: { name: true } },
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
    orderBy: { createdAt: 'desc' },
  });

  const serializedRegistrations: SerializedRegistration[] = registrations.map((reg) => {
    const isTeam = Boolean(reg.team);
    const displayName = isTeam
      ? reg.team!.name
      : reg.participant?.fullName ?? 'Participant';

    let members: SerializedMember[] = [];

    if (isTeam && reg.team) {
      const captain = reg.team.captain;
      const captainMember: SerializedMember = {
        id: captain.id,
        fullName: captain.fullName,
        email: captain.email,
        phone: captain.phone,
        cnic: captain.cnic,
        isCaptain: true,
      };

      const otherMembers: SerializedMember[] = reg.team.members
        .filter((m) => m.participant.id !== captain.id)
        .map((m) => ({
          id: m.participant.id,
          fullName: m.participant.fullName,
          email: m.participant.email,
          phone: m.participant.phone,
          cnic: m.participant.cnic,
          isCaptain: false,
        }));

      members = [captainMember, ...otherMembers];
    } else if (reg.participant) {
      members = [
        {
          id: reg.participant.id,
          fullName: reg.participant.fullName,
          email: reg.participant.email,
          phone: reg.participant.phone,
          cnic: reg.participant.cnic,
          isCaptain: false,
        },
      ];
    }

    return {
      id: reg.id,
      eventName: reg.event.name,
      isTeam,
      displayName,
      status: reg.status,
      createdAt: reg.createdAt.toISOString(),
      members,
    };
  });

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
          Campus Participants
        </h1>
        <div
          className="mt-2 h-[4px] w-[56px] rounded-[2px]"
          style={{ backgroundColor: 'var(--color-primary)' }}
        />
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          View all registrations and member details for your campus.
        </p>
      </div>

      <AmbassadorParticipantsTable registrations={serializedRegistrations} />
    </div>
  );
}
