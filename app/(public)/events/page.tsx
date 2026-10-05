import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCategoryColor } from '@/lib/theme';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { Button } from '@/components/ui/Button';

export const dynamic = "force-dynamic";

export default async function PublicEventsPage() {
  const events = await prisma.event.findMany({
    where: { status: { in: ['OPEN', 'CLOSED', 'COMPLETED'] } },
    orderBy: { eventDate: 'asc' },
  });

  const grouped = events.reduce<Record<string, typeof events>>((acc, event) => {
    const key = event.category ?? 'Other';
    acc[key] = acc[key] ? [...acc[key], event] : [event];
    return acc;
  }, {});

  const categories = Object.keys(grouped);

  return (
    <div className="w-full flex flex-col" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Page Header Band */}
      <section
        style={{
          backgroundColor: 'var(--color-secondary-deep)',
          paddingTop: '64px',
          paddingBottom: '64px',
        }}
        className="w-full"
      >
        <Container>
          <SectionHeading
            onDark
            eyebrow="Compete"
            title="Events"
            subtitle="Pick your arena."
          />
        </Container>
      </section>

      {/* Main Events List */}
      <section style={{ paddingTop: 'var(--section-pad-y)', paddingBottom: 'var(--section-pad-y)' }} className="w-full">
        <Container>
          {events.length === 0 && (
            <p className="text-base text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
              No events published yet.
            </p>
          )}

          <div className="flex flex-col gap-14">
            {categories.map((category) => {
              const catColor = getCategoryColor(category);

              return (
                <div key={category} className="flex flex-col gap-6">
                  {/* Category Group Heading */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-[6px] h-[28px] rounded-[2px]"
                      style={{ backgroundColor: catColor }}
                    />
                    <h2
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: 'var(--fs-title2)',
                        lineHeight: 'var(--lh-title2)',
                        color: 'var(--color-text)',
                      }}
                      className="font-bold uppercase tracking-wide"
                    >
                      {category}
                    </h2>
                  </div>

                  {/* Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {grouped[category].map((event) => {
                      const feeText = `Rs. ${event.registrationFee.toString()}`;
                      const prizeText = event.prizeMoney ? `Prize: Rs. ${event.prizeMoney.toString()}` : null;
                      const formattedDate = new Date(event.eventDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });

                      return (
                        <div
                          key={event.id}
                          className="flex flex-col justify-between overflow-hidden rounded-[var(--radius-md)] transition-all duration-200 hover:-translate-y-[6px]"
                          style={{
                            backgroundColor: 'var(--color-surface)',
                            boxShadow: 'var(--shadow-card)',
                          }}
                        >
                          {/* Top 8px Accent Strip */}
                          <div className="h-[8px] w-full" style={{ backgroundColor: catColor }} />

                          {/* Card Body */}
                          <div className="flex flex-col p-6 flex-1 gap-3">
                            <div className="flex items-center justify-between gap-2">
                              <CategoryBadge category={event.category} />
                              <span
                                style={{
                                  fontSize: 'var(--fs-caption1)',
                                  color: event.status === 'OPEN' ? 'var(--color-success)' : 'var(--color-text-muted)',
                                  backgroundColor: event.status === 'OPEN' ? 'rgba(45, 125, 70, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                }}
                                className="font-semibold uppercase"
                              >
                                {event.status}
                              </span>
                            </div>

                            <h3
                              style={{
                                fontFamily: 'var(--font-heading)',
                                fontSize: 'var(--fs-title2)',
                                lineHeight: 'var(--lh-title2)',
                                color: 'var(--color-text)',
                              }}
                              className="font-bold tracking-tight mt-1"
                            >
                              {event.name}
                            </h3>

                            <p
                              style={{
                                fontSize: 'var(--fs-footnote)',
                                lineHeight: 'var(--lh-footnote)',
                                color: 'var(--color-text-muted)',
                              }}
                            >
                              {event.venue ? `${event.venue} • ` : ''}{formattedDate}
                            </p>

                            <div className="mt-auto pt-4 border-t border-[var(--color-divider)] flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-col">
                                <span
                                  style={{
                                    fontFamily: 'var(--font-heading)',
                                    fontSize: 'var(--fs-title3)',
                                    color: 'var(--color-primary)',
                                  }}
                                  className="font-bold"
                                >
                                  {feeText}
                                </span>
                                {prizeText && (
                                  <span
                                    style={{
                                      fontSize: 'var(--fs-caption1)',
                                      color: 'var(--color-success)',
                                    }}
                                    className="font-semibold"
                                  >
                                    {prizeText}
                                  </span>
                                )}
                              </div>

                              <span
                                style={{
                                  fontSize: 'var(--fs-caption1)',
                                  color: 'var(--color-text-muted)',
                                }}
                                className="uppercase font-medium px-2 py-1 bg-gray-100 rounded-[var(--radius-sm)]"
                              >
                                {event.registrationType}
                              </span>
                            </div>

                            <div className="mt-4 pt-2">
                              <Button href={`/events/${event.id}`} variant="primary" className="w-full">
                                View Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Container>
      </section>
    </div>
  );
}
