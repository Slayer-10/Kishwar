import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { CancelRegistrationButton } from '@/components/dashboard/cancel-registration-button';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default async function ParticipantHomePage() {
  const user = await getCurrentUser();

  const registrations = await prisma.registration.findMany({
    where: {
      OR: [
        { participantId: user!.participant!.id },
        {
          team: {
            members: {
              some: {
                participantId: user!.participant!.id,
              },
            },
          },
        },
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
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Top Banner & Account Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-muted)]">
            Welcome back
          </span>
          <h1
            style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title1)' }}
            className="font-bold text-[var(--color-text)] uppercase"
          >
            {user!.participant!.fullName}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">{user!.email}</p>
        </div>

        <Button href="/participant/ambassador-application" variant="primary">
          Become a KISHWAR Ambassador
        </Button>
      </div>

      {/* Registrations Section (Cards) */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col">
          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--fs-title2)',
              color: 'var(--color-text)',
            }}
            className="font-bold uppercase tracking-tight"
          >
            My Registrations
          </h2>
          <div
            className="mt-2 h-[4px] w-[56px] rounded-[2px]"
            style={{ backgroundColor: 'var(--color-primary)' }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {registrations.map((registration) => (
            <div
              key={registration.id}
              className="flex flex-col justify-between p-6 rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] transition-all hover:-translate-y-[4px] border-t-4"
              style={{ borderTopColor: 'var(--color-secondary)' }}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={registration.status} />
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {new Date(registration.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <Link
                  href={`/events/${registration.eventId}`}
                  className="font-bold uppercase tracking-wide hover:text-[var(--color-primary)] transition-colors"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--fs-title2)',
                    color: 'var(--color-text)',
                  }}
                >
                  {registration.event.name}
                </Link>

                <div className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)] pt-2 border-t border-[var(--color-divider)]">
                  <div>
                    <span className="font-semibold text-[var(--color-text)]">Event Date:</span>{' '}
                    {new Date(registration.event.eventDate).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-semibold text-[var(--color-text)]">Ambassador:</span>{' '}
                    {registration.ambassador?.user.email ?? 'Direct'}
                  </div>
                  {registration.ambassador?.university && (
                    <div>
                      <span className="font-semibold text-[var(--color-text)]">University:</span>{' '}
                      {registration.ambassador.university.name}
                    </div>
                  )}
                </div>
              </div>

              {registration.status === 'PENDING' &&
                registration.participantId === user!.participant!.id && (
                  <div className="mt-4 pt-3 border-t border-[var(--color-divider)]">
                    <CancelRegistrationButton registrationId={registration.id} />
                  </div>
                )}
            </div>
          ))}
        </div>

        {registrations.length === 0 && (
          <div className="p-12 text-center rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] text-[var(--color-text-muted)]">
            No event registrations yet. Browse our events to get started!
          </div>
        )}
      </div>
    </div>
  );
}
