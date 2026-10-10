import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AmbassadorManualRegistrationSection } from '@/components/dashboard/AmbassadorManualRegistrationSection';

export default async function AmbassadorHomePage() {
  const user = await getCurrentUser();

  const ambassador = await prisma.ambassador.findUnique({
    where: { id: user!.ambassador!.id },
    include: { university: true },
  });

  const [teams, individualRegistrations, myParticipation, openEvents] = await Promise.all([
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

    prisma.event.findMany({
      where: {
        status: 'OPEN',
        deadline: { gte: new Date() },
      },
      select: {
        id: true,
        name: true,
        registrationType: true,
        minTeamSize: true,
        maxTeamSize: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      {/* Top Banner */}
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
          Ambassador Dashboard
        </h1>
        <div
          className="mt-2 h-[4px] w-[56px] rounded-[2px]"
          style={{ backgroundColor: 'var(--color-primary)' }}
        />
        <p className="mt-2 text-sm text-[var(--color-text-muted)] font-medium">
          {ambassador?.university.name} ({ambassador?.ambassadorCode})
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] flex flex-col items-start border-l-4 border-l-[var(--color-primary)]">
          <span className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
            Individual Registrations Handled
          </span>
          <span
            style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-large)' }}
            className="font-bold text-[var(--color-primary)] mt-1"
          >
            {individualRegistrations.length}
          </span>
        </div>

        <div className="p-6 rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] flex flex-col items-start border-l-4 border-l-[var(--color-secondary)]">
          <span className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
            Team Registrations Handled
          </span>
          <span
            style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-large)' }}
            className="font-bold text-[var(--color-secondary)] mt-1"
          >
            {teams.length}
          </span>
        </div>

        <div className="p-6 rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] flex flex-col items-start border-l-4 border-l-[var(--color-accent)]">
          <span className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
            My Own Participations
          </span>
          <span
            style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-large)' }}
            className="font-bold text-[var(--color-accent)] mt-1"
          >
            {myParticipation.length}
          </span>
        </div>
      </div>

      {/* Manual Participant & Team Registration Section */}
      <AmbassadorManualRegistrationSection events={openEvents} />

      {/* My Personal Participation */}
      <section className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] border-t-4 border-t-[var(--color-accent)] flex flex-col gap-4">
        <div className="flex flex-col">
          <h2
            style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
            className="font-bold uppercase text-[var(--color-text)]"
          >
            My Personal Participation
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Events you are personally participating in as a participant or team member.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {myParticipation.map((reg) => (
            <div
              key={reg.id}
              className="p-4 rounded-[var(--radius-sm)] bg-[var(--color-background)] flex flex-wrap items-center justify-between gap-4"
            >
              <div>
                <Link
                  href={`/events/${reg.eventId}`}
                  className="font-bold uppercase tracking-wide text-[var(--color-primary)] hover:underline"
                >
                  {reg.event.name}
                </Link>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Event Date: {new Date(reg.event.eventDate).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={reg.status} />
                {reg.invoice && <StatusBadge status={reg.invoice.status} />}
              </div>
            </div>
          ))}

          {myParticipation.length === 0 && (
            <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
              You have not registered for any events personally yet.
            </p>
          )}
        </div>
      </section>

      {/* Individual Registrations Handled */}
      <section className="flex flex-col gap-4">
        <h2
          style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
          className="font-bold uppercase tracking-tight text-[var(--color-text)]"
        >
          Individual Registrations Handled ({individualRegistrations.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {individualRegistrations.map((reg) => {
            const invoice = reg.invoice;
            const latestPayment = invoice?.payments[0];

            return (
              <div
                key={reg.id}
                className="p-5 rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-[var(--color-text)]">{reg.participant?.fullName}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {reg.participant?.email} — {reg.event.name}
                    </p>
                  </div>
                  <StatusBadge status={reg.status} />
                </div>

                {invoice && (
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--color-divider)] text-xs">
                    <span className="text-[var(--color-text-muted)]">Invoice:</span>
                    <span className="font-bold text-[var(--color-primary)]">
                      PKR {invoice.amount.toString()} ({invoice.status})
                    </span>
                  </div>
                )}

                {latestPayment && (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Payment: {latestPayment.method} ({latestPayment.verificationStatus})
                  </p>
                )}
              </div>
            );
          })}

          {individualRegistrations.length === 0 && (
            <p className="col-span-full text-center py-8 text-[var(--color-text-muted)] text-sm">
              No individual registrations handled by you yet.
            </p>
          )}
        </div>
      </section>

      {/* Team Registrations Handled */}
      <section className="flex flex-col gap-4">
        <h2
          style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
          className="font-bold uppercase tracking-tight text-[var(--color-text)]"
        >
          Team Registrations Handled ({teams.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teams.map((team) => {
            const registration = team.registrations[0];
            const invoice = registration?.invoice;
            const latestPayment = invoice?.payments[0];

            return (
              <div
                key={team.id}
                className="p-6 rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-2 border-b border-[var(--color-divider)] pb-3">
                  <div>
                    <p
                      style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
                      className="font-bold text-[var(--color-text)] uppercase"
                    >
                      {team.name}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">{team.event.name}</p>
                  </div>
                  <StatusBadge status={registration?.status} />
                </div>

                <div className="flex flex-col gap-2 text-xs text-[var(--color-text-muted)]">
                  <p className="font-semibold text-[var(--color-text)]">Captain:</p>
                  <p className="pl-2">
                    {team.captain.fullName} — {team.captain.email}
                  </p>

                  {team.members.length > 0 && (
                    <>
                      <p className="font-semibold text-[var(--color-text)] mt-2">Members:</p>
                      <ul className="list-disc pl-6 space-y-1">
                        {team.members
                          .filter((m) => m.participantId !== team.captainId)
                          .map((m) => (
                            <li key={m.id}>
                              {m.participant.fullName} — {m.participant.email}
                            </li>
                          ))}
                      </ul>
                    </>
                  )}
                </div>

                {latestPayment && (
                  <div className="pt-3 border-t border-[var(--color-divider)] flex items-center justify-between text-xs">
                    <span className="text-[var(--color-text-muted)]">Latest payment:</span>
                    <StatusBadge status={latestPayment.verificationStatus} />
                  </div>
                )}
              </div>
            );
          })}

          {teams.length === 0 && (
            <p className="col-span-full text-center py-8 text-[var(--color-text-muted)] text-sm">
              No teams registered by you yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
