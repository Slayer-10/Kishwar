import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getCategoryColor } from '@/lib/theme';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { AmbassadorRegisterForm } from '@/components/public/ambassador-register-form';
import { AmbassadorTeamRegisterForm } from '@/components/public/ambassador-team-register-form';
import { AmbassadorSelfRegisterForm } from '@/components/public/ambassador-self-register-form';

export default async function PublicEventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();

  const event = await prisma.event.findUnique({
    where: { id: params.id },
  });

  if (!event || event.status === 'DRAFT' || event.status === 'CANCELLED') {
    notFound();
  }

  const categoryColor = getCategoryColor(event.category);
  const formattedEventDate = new Date(event.eventDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedDeadline = new Date(event.deadline).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="w-full flex flex-col" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Hero Band */}
      <section
        style={{
          backgroundColor: 'var(--color-secondary-deep)',
          borderBottom: `8px solid ${categoryColor}`,
          paddingTop: '48px',
          paddingBottom: '48px',
        }}
        className="w-full text-white"
      >
        <Container>
          <div className="flex flex-col gap-4">
            <Link
              href="/events"
              className="text-xs uppercase tracking-wider font-semibold opacity-80 hover:opacity-100 hover:text-[var(--color-accent)] transition-colors self-start"
            >
              ← Back to Events
            </Link>

            <div className="flex flex-col items-start gap-2 mt-2">
              <CategoryBadge category={event.category} />
              <h1
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'var(--fs-large)',
                  lineHeight: 'var(--lh-large)',
                  color: '#FFFFFF',
                }}
                className="font-bold uppercase tracking-tight mt-1"
              >
                {event.name}
              </h1>
            </div>

            {/* 3 Info Chips */}
            <div className="flex flex-wrap items-center gap-6 mt-4 pt-4 border-t border-white/10">
              <div className="flex flex-col">
                <span
                  style={{
                    fontSize: 'var(--fs-caption1)',
                    color: 'var(--color-accent)',
                  }}
                  className="font-semibold uppercase tracking-wider"
                >
                  Event Date
                </span>
                <span className="text-sm font-medium text-white">{formattedEventDate}</span>
              </div>

              <div className="flex flex-col">
                <span
                  style={{
                    fontSize: 'var(--fs-caption1)',
                    color: 'var(--color-accent)',
                  }}
                  className="font-semibold uppercase tracking-wider"
                >
                  Venue
                </span>
                <span className="text-sm font-medium text-white">{event.venue || 'FAST-NUCES Multan'}</span>
              </div>

              <div className="flex flex-col">
                <span
                  style={{
                    fontSize: 'var(--fs-caption1)',
                    color: 'var(--color-accent)',
                  }}
                  className="font-semibold uppercase tracking-wider"
                >
                  Deadline
                </span>
                <span className="text-sm font-medium text-white">{formattedDeadline}</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Main Content: 2 Columns Layout */}
      <section style={{ paddingTop: 'var(--section-pad-y)', paddingBottom: 'var(--section-pad-y)' }} className="w-full">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
            {/* Left Column: Details & Rules */}
            <div className="flex flex-col gap-8">
              {/* About Section */}
              <div
                className="p-7 rounded-[var(--radius-md)] flex flex-col gap-4"
                style={{ backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
              >
                <div className="flex flex-col">
                  <span
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '14px',
                      color: 'var(--color-primary)',
                      letterSpacing: '0.15em',
                    }}
                    className="uppercase font-semibold"
                  >
                    Overview
                  </span>
                  <h2
                    style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
                    className="font-bold uppercase tracking-tight text-[var(--color-text)]"
                  >
                    About The Event
                  </h2>
                  <div
                    className="mt-2 h-[3px] w-[40px] rounded-[2px]"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  />
                </div>

                <p
                  style={{ lineHeight: 'var(--lh-body)', color: 'var(--color-text)' }}
                  className="text-base whitespace-pre-line"
                >
                  {event.description || 'No detailed description provided for this event.'}
                </p>
              </div>

              {/* Rules Section */}
              {event.rules && (
                <div
                  className="p-7 rounded-[var(--radius-md)] flex flex-col gap-4"
                  style={{ backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}
                >
                  <div className="flex flex-col">
                    <span
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '14px',
                        color: 'var(--color-primary)',
                        letterSpacing: '0.15em',
                      }}
                      className="uppercase font-semibold"
                    >
                      Guidelines
                    </span>
                    <h2
                      style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
                      className="font-bold uppercase tracking-tight text-[var(--color-text)]"
                    >
                      Event Rules
                    </h2>
                    <div
                      className="mt-2 h-[3px] w-[40px] rounded-[2px]"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    />
                  </div>

                  <div
                    style={{ lineHeight: 'var(--lh-body)', color: 'var(--color-text)' }}
                    className="text-base whitespace-pre-line"
                  >
                    {event.rules}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Registration Card (Sticky) */}
            <div className="lg:sticky lg:top-[96px] flex flex-col gap-6">
              <div
                className="p-7 rounded-[var(--radius-lg)] flex flex-col gap-5 border-t-4"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  boxShadow: 'var(--shadow-hover)',
                  borderTopColor: 'var(--color-primary)',
                }}
              >
                <div className="flex items-center justify-between gap-2 border-b border-[var(--color-divider)] pb-4">
                  <div className="flex flex-col">
                    <span className="text-xs uppercase font-semibold text-[var(--color-text-muted)]">
                      Registration Fee
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: 'var(--fs-title1)',
                        color: 'var(--color-primary)',
                      }}
                      className="font-bold"
                    >
                      PKR {event.registrationFee.toString()}
                    </span>
                  </div>

                  <span className="text-xs uppercase font-semibold px-3 py-1 bg-gray-100 rounded-[var(--radius-pill)]">
                    {event.registrationType}
                  </span>
                </div>

                {/* Event Metadata Highlights */}
                <div className="flex flex-col gap-3 text-sm">
                  {event.prizeMoney && (
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--color-text-muted)] font-medium">Prize Money:</span>
                      <span className="font-bold text-[var(--color-success)]">
                        PKR {event.prizeMoney.toString()}
                      </span>
                    </div>
                  )}

                  {(event.minTeamSize || event.maxTeamSize) && (
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--color-text-muted)] font-medium">Team Size:</span>
                      <span className="font-bold text-[var(--color-text)]">
                        {event.minTeamSize}–{event.maxTeamSize} Members
                      </span>
                    </div>
                  )}
                </div>

                {/* Registration Action Section */}
                {event.status === 'OPEN' && (
                  <div className="pt-4 border-t border-[var(--color-divider)]">
                    <h3
                      style={{ fontFamily: 'var(--font-heading)' }}
                      className="text-lg font-bold uppercase mb-3 text-[var(--color-text)]"
                    >
                      Registration
                    </h3>

                    {!user && (
                      <div className="flex flex-col gap-3">
                        <p className="text-sm text-[var(--color-text-muted)]">
                          Log in to continue with event registration.
                        </p>
                        <Button href="/login" variant="primary" className="w-full">
                          Login to Register
                        </Button>
                      </div>
                    )}

                    {user?.role === 'PARTICIPANT' && (
                      <div className="flex flex-col gap-3">
                        <p className="text-sm text-[var(--color-text-muted)]">
                          Event registration is handled by authorized KISHWAR Ambassadors.
                        </p>
                        <Button href="/participant/ambassador-application" variant="primary" className="w-full">
                          Ask Ambassador to Register
                        </Button>
                      </div>
                    )}

                    {user?.role === 'AMBASSADOR' && (
                      <div className="flex flex-col gap-6">
                        {event.registrationType !== 'TEAM' && (
                          <div className="flex flex-col gap-3">
                            <AmbassadorSelfRegisterForm eventId={event.id} />
                            <div className="my-2 border-t border-[var(--color-divider)]" />
                            <AmbassadorRegisterForm eventId={event.id} />
                          </div>
                        )}

                        {event.registrationType !== 'INDIVIDUAL' && (
                          <div className="flex flex-col gap-3">
                            <AmbassadorTeamRegisterForm
                              eventId={event.id}
                              minTeamSize={event.minTeamSize}
                              maxTeamSize={event.maxTeamSize}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
