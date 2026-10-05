import React from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { siteConfig } from '@/lib/site-config';
import { categoryColorVars } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Marquee } from '@/components/ui/Marquee';
import { Countdown } from '@/components/home/Countdown';
import { CountUp } from '@/components/home/CountUp';
import { Reveal } from '@/components/ui/Reveal';

function formatEventDates(startIso: string, endIso: string): string {
  try {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const day1 = start.getDate();
    const day2 = day1 + 1;
    const day3 = end.getDate();
    const monthYear = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(end);
    return `${day1} · ${day2} · ${day3} ${monthYear}`;
  } catch {
    return '1 · 2 · 3 December 2026';
  }
}

const CATEGORIES = [
  { name: 'Creatives', colorVar: categoryColorVars.creatives, initial: 'C' },
  { name: 'Technical', colorVar: categoryColorVars.technical, initial: 'T' },
  { name: 'E-Sports', colorVar: categoryColorVars.esports, initial: 'E' },
  { name: 'Indoor Sports', colorVar: categoryColorVars.indoor, initial: 'I' },
  { name: 'Outdoor Sports', colorVar: categoryColorVars.outdoor, initial: 'O' },
  { name: 'Socials', colorVar: categoryColorVars.socials, initial: 'S' },
  { name: 'Literary Sports', colorVar: categoryColorVars.literary, initial: 'L' },
];

export default async function HomePage() {
  const user = await getCurrentUser();

  let ambassadorHref = '/ambassador-application';
  let ambassadorLabel = 'Become an Ambassador';

  if (user) {
    if (user.role === 'PARTICIPANT') {
      ambassadorHref = '/ambassador-application';
    } else if (user.role === 'AMBASSADOR') {
      ambassadorHref = '/ambassador';
      ambassadorLabel = 'Ambassador Dashboard';
    } else if (user.role === 'SUPER_ADMIN') {
      ambassadorHref = '/admin';
    } else if (user.role === 'FDO') {
      ambassadorHref = '/fdo';
    }
  }

  const formattedDates = formatEventDates(siteConfig.eventStart, siteConfig.eventEnd);

  return (
    <div className="w-full flex flex-col overflow-x-hidden">
      {/* 1. HERO SECTION */}
      <section
        className="relative flex min-h-[calc(100vh-72px)] w-full flex-col items-center justify-center text-center px-4 py-16"
        style={{
          backgroundColor: 'var(--color-secondary-deep)',
          backgroundImage: `
            radial-gradient(ellipse at 70% 30%, rgba(106, 172, 220, 0.25), transparent 60%),
            repeating-linear-gradient(45deg, rgba(106, 172, 220, 0.06) 0, rgba(106, 172, 220, 0.06) 1px, transparent 0, transparent 24px),
            repeating-linear-gradient(-45deg, rgba(106, 172, 220, 0.06) 0, rgba(106, 172, 220, 0.06) 1px, transparent 0, transparent 24px)
          `,
        }}
      >
        <Reveal className="z-10 flex flex-col items-center max-w-4xl mx-auto">
          {/* Urdu Name */}
          <span
            style={{
              color: 'var(--color-primary)',
              fontSize: 'clamp(4rem, 14vw, 10rem)',
              lineHeight: 1,
            }}
            className="font-bold select-none drop-shadow-md"
          >
            {siteConfig.nameUrdu}
          </span>

          {/* Title */}
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--fs-display)',
              lineHeight: 'var(--lh-display)',
              color: '#FFFFFF',
            }}
            className="font-bold uppercase tracking-tight mt-2"
          >
            {siteConfig.name} {siteConfig.year}
          </h1>

          {/* Subheading */}
          <p
            style={{
              color: 'var(--color-accent)',
              letterSpacing: '0.3em',
              fontSize: '16px',
            }}
            className="font-semibold uppercase mt-3"
          >
            {siteConfig.tagline}
          </p>

          {/* Date + Venue */}
          <p className="mt-2 text-sm md:text-base text-white/80 font-medium">
            {formattedDates} &nbsp;·&nbsp; {siteConfig.venue}
          </p>

          {/* Countdown Component */}
          <Countdown targetDate={siteConfig.eventStart} />

          {/* CTAs */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Button href="/events" variant="primary">
              Register Now
            </Button>
            <Button href="#about" variant="ghost" className="text-white border-white hover:bg-white/10">
              Explore Events
            </Button>
          </div>
        </Reveal>

        {/* Animated Chevron Down */}
        <a
          href="#about"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 transition-colors hover:text-white animate-bounce"
          aria-label="Scroll to About section"
        >
          <ChevronDown size={32} />
        </a>
      </section>

      {/* 2. MARQUEE STRIP */}
      <Marquee />

      {/* 3. ABOUT SECTION */}
      <section
        id="about"
        style={{
          backgroundColor: 'var(--color-background)',
          paddingTop: 'var(--section-pad-y)',
          paddingBottom: 'var(--section-pad-y)',
        }}
        className="w-full"
      >
        <Container>
          <Reveal>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left Col */}
              <div className="flex flex-col items-start">
                <SectionHeading
                  eyebrow="A Legacy of Excellence"
                  title="Multan's Biggest Student Festival"
                />
                <p
                  style={{ lineHeight: 'var(--lh-body)', color: 'var(--color-text-muted)' }}
                  className="mt-4 text-base md:text-lg"
                >
                  KISHWAR is FAST-NUCES Multan&apos;s flagship mega event, hosting competitions
                  across computing, business, sports, and social categories.
                </p>
                <p
                  style={{ lineHeight: 'var(--lh-body)', color: 'var(--color-text-muted)' }}
                  className="mt-3 text-base md:text-lg"
                >
                  Teams from universities nationwide compete, network, and showcase their talent over
                  multiple days of events. Sports, technology, arts, and culture — all under one roof
                  at FAST-NUCES Multan Campus.
                </p>
                {ambassadorHref && (
                  <div className="mt-6">
                    <Button href={ambassadorHref} variant="secondary">
                      {ambassadorLabel}
                    </Button>
                  </div>
                )}
              </div>

              {/* Right Col Framed Image */}
              <div className="relative mx-auto w-full max-w-[360px] aspect-[4/5] flex items-center justify-center">
                <div
                  className="absolute inset-0 translate-x-[12px] translate-y-[12px] rounded-[var(--radius-lg)] border-2 pointer-events-none"
                  style={{ borderColor: 'var(--color-primary)' }}
                />
                <div
                  className="relative z-10 w-full h-full rounded-[var(--radius-lg)] p-8 flex flex-col items-center justify-center text-center shadow-[var(--shadow-card)]"
                  style={{ backgroundColor: 'var(--color-surface)' }}
                >
                  <img
                    src="/images/kishwar-logo.png"
                    alt="KISHWAR 26 Logo"
                    className="max-h-[180px] max-w-[180px] object-contain drop-shadow-md mb-4"
                  />
                  <h3
                    style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-secondary)' }}
                    className="text-xl font-bold uppercase tracking-wide"
                  >
                    KISHWAR 26
                  </h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    FAST-NUCES Multan Campus
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* 4. STATS GRID */}
      <section
        style={{
          backgroundColor: 'var(--color-surface)',
          paddingTop: 'var(--section-pad-y)',
          paddingBottom: 'var(--section-pad-y)',
          borderTop: '1px solid var(--color-divider)',
          borderBottom: '1px solid var(--color-divider)',
        }}
        className="w-full"
      >
        <Container>
          <Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {siteConfig.stats.map((stat, idx) => (
                <CountUp
                  key={idx}
                  targetValue={stat.value}
                  label={stat.label}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                />
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      {/* 5. COMPETITION CATEGORIES */}
      <section
        style={{
          backgroundColor: 'var(--color-background)',
          paddingTop: 'var(--section-pad-y)',
          paddingBottom: 'var(--section-pad-y)',
        }}
        className="w-full"
      >
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Competitions"
              title="Competition Categories"
              align="center"
              className="mb-12"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.name}
                  href="/events"
                  className="group flex flex-col items-center text-center p-6 rounded-[var(--radius-md)] text-decoration-none transition-all duration-200 hover:-translate-y-[6px]"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderTop: `4px solid ${cat.colorVar}`,
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <div
                    className="flex items-center justify-center w-[48px] h-[48px] rounded-full text-white font-bold text-lg mb-4 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: cat.colorVar, fontFamily: 'var(--font-heading)' }}
                  >
                    {cat.initial}
                  </div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 'var(--fs-title3)',
                      color: 'var(--color-text)',
                    }}
                    className="font-semibold uppercase tracking-wide group-hover:text-[var(--color-primary)] transition-colors"
                  >
                    {cat.name}
                  </h3>
                </Link>
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      {/* 6. CTA BAND */}
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
          <Reveal>
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--fs-title1)',
                lineHeight: 'var(--lh-title1)',
              }}
              className="font-bold uppercase"
            >
              Ready to Register?
            </h2>
            <p className="text-lg opacity-90 max-w-xl mt-2">
              Secure your spot at KISHWAR 26.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 justify-center">
              <Button href="/events" variant="secondary">
                Register Now
              </Button>
              {ambassadorHref && (
                <Button
                  href={ambassadorHref}
                  variant="ghost"
                  className="border-white text-white hover:bg-white/10"
                >
                  {ambassadorLabel}
                </Button>
              )}
            </div>
          </Reveal>
        </Container>
      </section>
    </div>
  );
}
