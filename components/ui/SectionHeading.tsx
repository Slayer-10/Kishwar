import React from 'react';

export interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  onDark?: boolean;
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  onDark = false,
  className = '',
}: SectionHeadingProps) {
  const isCenter = align === 'center';

  return (
    <div className={`flex flex-col ${isCenter ? 'items-center text-center' : 'items-start text-left'} ${className}`}>
      {eyebrow && (
        <span
          className="uppercase font-semibold mb-2"
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '14px',
            letterSpacing: '0.2em',
            color: onDark ? 'var(--color-accent)' : 'var(--color-primary)',
          }}
        >
          {eyebrow}
        </span>
      )}
      <h2
        className="uppercase font-bold"
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'var(--fs-large)',
          lineHeight: 'var(--lh-large)',
          color: onDark ? 'var(--color-text-on-dark)' : 'var(--color-text)',
        }}
      >
        {title}
      </h2>
      <div
        className={`mt-3 mb-4 h-[4px] w-[56px] rounded-[2px] ${isCenter ? 'mx-auto' : ''}`}
        style={{ backgroundColor: 'var(--color-primary)' }}
      />
      {subtitle && (
        <p
          className="max-w-2xl text-base"
          style={{
            color: onDark ? 'rgba(255, 255, 255, 0.75)' : 'var(--color-text-muted)',
            lineHeight: 'var(--lh-body)',
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
