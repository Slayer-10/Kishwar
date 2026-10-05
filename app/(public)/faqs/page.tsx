import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Button } from '@/components/ui/Button';
import { FAQSection } from '@/components/public/faq-section';

export default function FAQsPage() {
  return (
    <div className="w-full py-16" style={{ backgroundColor: 'var(--color-background)' }}>
      <Container className="max-w-5xl">
        <Link
          href="/"
          className="text-xs uppercase font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
        >
          ← Back to KISHWAR Home
        </Link>

        <SectionHeading
          eyebrow="Help & Information"
          title="Frequently Asked Questions"
          subtitle="Find answers to common questions regarding registration, Ambassador applications, events, and payments."
          className="mt-6 mb-10"
        />

        <div className="mb-12">
          <FAQSection />
        </div>

        <div className="p-8 rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h2
              style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
              className="font-bold text-[var(--color-text)] uppercase tracking-wide"
            >
              Have more questions?
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Reach out directly to the KISHWAR administration team.
            </p>
          </div>
          <Button href="/contact" variant="primary">
            Contact Us
          </Button>
        </div>
      </Container>
    </div>
  );
}
