import React from 'react';

interface PlaceholderCardProps {
  title?: string;
  description: string;
}

export function PlaceholderCard({ title = 'Coming Soon', description }: PlaceholderCardProps) {
  return (
    <div
      className="mx-auto my-12 max-w-lg p-10 text-center rounded-[var(--radius-lg)] flex flex-col items-center justify-center gap-4 border"
      style={{
        backgroundColor: 'var(--color-surface)',
        boxShadow: 'var(--shadow-card)',
        borderColor: 'var(--color-divider)',
      }}
    >
      <img
        src="/images/kishwar-logo.png"
        alt="KISHWAR Logo"
        className="w-[100px] h-[100px] object-contain opacity-25"
      />
      <h2
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'var(--fs-title2)',
          color: 'var(--color-secondary)',
        }}
        className="font-bold uppercase tracking-wider mt-2"
      >
        {title}
      </h2>
      <p style={{ color: 'var(--color-text-muted)' }} className="text-sm leading-relaxed max-w-md">
        {description}
      </p>
    </div>
  );
}
