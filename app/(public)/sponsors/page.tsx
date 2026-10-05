import React from 'react';
import { siteConfig } from '@/lib/site-config';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Button } from '@/components/ui/Button';

type Sponsor = {
  name: string;
  tier: 'Title' | 'Gold' | 'Silver' | 'Bronze';
};

const SPONSORS: Sponsor[] = [
  { name: 'Sponsor Name', tier: 'Title' },
  { name: 'Sponsor Name', tier: 'Gold' },
  { name: 'Sponsor Name', tier: 'Gold' },
  { name: 'Sponsor Name', tier: 'Silver' },
  { name: 'Sponsor Name', tier: 'Silver' },
  { name: 'Sponsor Name', tier: 'Silver' },
  { name: 'Sponsor Name', tier: 'Bronze' },
  { name: 'Sponsor Name', tier: 'Bronze' },
];

const TIER_ORDER: Sponsor['tier'][] = ['Title', 'Gold', 'Silver', 'Bronze'];

const TIER_CONFIG: Record<
  Sponsor['tier'],
  { color: string; minHeight: string; gridClass: string }
> = {
  Title: {
    color: 'var(--color-primary)',
    minHeight: '180px',
    gridClass: 'grid-cols-1 max-w-[520px] mx-auto',
  },
  Gold: {
    color: '#C9A227',
    minHeight: '140px',
    gridClass: 'grid-cols-2 md:grid-cols-3',
  },
  Silver: {
    color: '#8C8C8C',
    minHeight: '110px',
    gridClass: 'grid-cols-2 md:grid-cols-4',
  },
  Bronze: {
    color: 'var(--color-cat-outdoor)',
    minHeight: '90px',
    gridClass: 'grid-cols-2 md:grid-cols-5',
  },
};

export default function SponsorsPage() {
  const grouped = TIER_ORDER.map((tier) => ({
    tier,
    sponsors: SPONSORS.filter((s) => s.tier === tier),
  })).filter((group) => group.sponsors.length > 0);

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
            eyebrow="Partners"
            title="Sponsors"
            subtitle="KISHWAR is made possible by the support of our sponsors and partners."
          />
        </Container>
      </section>

      {/* Main Sponsors Tiers */}
      <section style={{ paddingTop: 'var(--section-pad-y)', paddingBottom: 'var(--section-pad-y)' }} className="w-full">
        <Container>
          <div className="flex flex-col gap-14">
            {grouped.map((group) => {
              const config = TIER_CONFIG[group.tier];

              return (
                <div key={group.tier} className="flex flex-col gap-8">
                  {/* Tier Label Divider Header */}
                  <div className="flex items-center gap-4 w-full">
                    <div className="flex-1 h-[1px]" style={{ backgroundColor: 'var(--color-divider)' }} />
                    <h2
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: 'var(--fs-title2)',
                        color: config.color,
                      }}
                      className="font-bold uppercase tracking-wider text-center shrink-0 px-2"
                    >
                      {group.tier} Sponsors
                    </h2>
                    <div className="flex-1 h-[1px]" style={{ backgroundColor: 'var(--color-divider)' }} />
                  </div>

                  {/* Grid of Sponsors */}
                  <div className={`grid gap-6 ${config.gridClass}`}>
                    {group.sponsors.map((sponsor, i) => (
                      <div
                        key={`${sponsor.name}-${i}`}
                        className="flex items-center justify-center p-6 rounded-[var(--radius-md)] text-center font-semibold text-decoration-none transition-all duration-200 hover:-translate-y-[4px]"
                        style={{
                          backgroundColor: 'var(--color-surface)',
                          boxShadow: 'var(--shadow-card)',
                          minHeight: config.minHeight,
                          color: 'var(--color-text)',
                        }}
                      >
                        {sponsor.name}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Bottom Sponsor CTA Strip */}
      <section
        style={{
          backgroundColor: 'var(--color-primary)',
          color: '#FFFFFF',
          paddingTop: 'var(--section-pad-y)',
          paddingBottom: 'var(--section-pad-y)',
        }}
        className="w-full text-center"
      >
        <Container className="flex flex-col items-center text-center gap-4">
          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--fs-title1)',
              lineHeight: 'var(--lh-title1)',
            }}
            className="font-bold uppercase"
          >
            Want to sponsor KISHWAR?
          </h2>
          <p className="text-base opacity-90 max-w-xl">
            Partner with FAST-NUCES Multan&apos;s flagship mega event to reach thousands of students nationwide.
          </p>
          {siteConfig.contactEmail && (
            <div className="mt-2">
              <Button href={`mailto:${siteConfig.contactEmail}`} variant="secondary">
                Contact Sponsorship Team
              </Button>
            </div>
          )}
        </Container>
      </section>
    </div>
  );
}
