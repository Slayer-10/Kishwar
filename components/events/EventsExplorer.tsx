'use client';

import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { getCategoryColor } from '@/lib/theme';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { Button } from '@/components/ui/Button';

export type SerializedEvent = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  venue: string | null;
  eventDate: string;
  registrationFee: string;
  prizeMoney: string | null;
  status: string;
  registrationType: string;
};

interface EventsExplorerProps {
  events: SerializedEvent[];
}

export function EventsExplorer({ events }: EventsExplorerProps) {
  const [searchInput, setSearchInput] = useState('');

  const query = searchInput.trim().toLowerCase();

  let displayEvents = events;
  let noResults = false;
  let matchedCount = 0;

  if (query !== '') {
    const filtered = events.filter((e) => {
      const nameMatch = e.name.toLowerCase().includes(query);
      const categoryMatch = e.category ? e.category.toLowerCase().includes(query) : false;
      const descriptionMatch = e.description ? e.description.toLowerCase().includes(query) : false;
      const venueMatch = e.venue ? e.venue.toLowerCase().includes(query) : false;

      return nameMatch || categoryMatch || descriptionMatch || venueMatch;
    });

    if (filtered.length === 0) {
      noResults = true;
      displayEvents = events;
      matchedCount = 0;
    } else {
      displayEvents = filtered;
      matchedCount = filtered.length;
    }
  }

  const grouped = displayEvents.reduce<Record<string, SerializedEvent[]>>((acc, event) => {
    const key = event.category ?? 'Other';
    acc[key] = acc[key] ? [...acc[key], event] : [event];
    return acc;
  }, {});

  const categories = Object.keys(grouped);

  return (
    <div className="w-full flex flex-col" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Page Header Band (Blue Hero Block) */}
      <section
        style={{
          backgroundColor: 'var(--color-secondary-deep)',
          paddingTop: '64px',
          paddingBottom: '64px',
        }}
        className="w-full"
      >
        <Container className="flex flex-col items-center">
          <SectionHeading
            onDark
            eyebrow="Compete"
            title="Events"
            subtitle="Pick your arena."
            align="center"
          />

          {/* Search Bar Container */}
          <form
            onSubmit={(e) => e.preventDefault()}
            className="relative w-full max-w-xl mt-8 flex flex-col items-center px-2"
          >
            <div className="relative w-full">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"
              />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchInput('');
                  }
                }}
                placeholder="Search events, e.g. Hackathon, Gaming, Debate…"
                aria-label="Search events"
                className="w-full h-[50px] pl-12 pr-12 rounded-full bg-white text-[var(--color-text)] placeholder:text-gray-400 text-sm font-medium shadow-md outline-none transition-all duration-200 focus:ring-4 focus:ring-white/30 focus:border-transparent"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1 rounded-full"
                  aria-label="Clear search"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Notice or Match Count */}
            {noResults ? (
              <p className="mt-3 text-sm text-white/80 font-medium text-center" aria-live="polite">
                No events found for &ldquo;{searchInput.trim()}&rdquo; &mdash; showing all events.
              </p>
            ) : searchInput.trim() !== '' ? (
              <p className="mt-3 text-sm text-white/80 font-medium text-center" aria-live="polite">
                {matchedCount} {matchedCount === 1 ? 'event' : 'events'} found
              </p>
            ) : null}
          </form>
        </Container>
      </section>

      {/* Main Events List */}
      <section
        style={{ paddingTop: 'var(--section-pad-y)', paddingBottom: 'var(--section-pad-y)' }}
        className="w-full"
      >
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
                      const feeText = `Rs. ${event.registrationFee}`;
                      const prizeText = event.prizeMoney ? `Prize: Rs. ${event.prizeMoney}` : null;
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
                                  color:
                                    event.status === 'OPEN'
                                      ? 'var(--color-success)'
                                      : 'var(--color-text-muted)',
                                  backgroundColor:
                                    event.status === 'OPEN'
                                      ? 'rgba(45, 125, 70, 0.1)'
                                      : 'rgba(0, 0, 0, 0.05)',
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
                              {event.venue ? `${event.venue} • ` : ''}
                              {formattedDate}
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
