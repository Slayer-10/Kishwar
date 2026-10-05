import React from 'react';

interface StatusBadgeProps {
  status?: string | null;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const s = (status ?? 'UNKNOWN').toUpperCase();

  let bg = 'var(--color-info)';

  if (s.includes('PENDING') || s.includes('INVOICED')) {
    bg = 'var(--color-warning)';
  } else if (
    s.includes('CONFIRMED') ||
    s.includes('VERIFIED') ||
    s.includes('PAID') ||
    s.includes('VALID') ||
    s.includes('OPEN')
  ) {
    bg = 'var(--color-success)';
  } else if (
    s.includes('REJECTED') ||
    s.includes('CANCELLED') ||
    s.includes('INVALID') ||
    s.includes('CLOSED')
  ) {
    bg = 'var(--color-danger)';
  }

  return (
    <span
      className={`inline-flex items-center justify-center font-bold uppercase ${className}`}
      style={{
        backgroundColor: bg,
        color: '#FFFFFF',
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--fs-caption1)',
        lineHeight: 'var(--lh-caption1)',
        padding: '3px 10px',
        borderRadius: 'var(--radius-pill)',
      }}
    >
      {s}
    </span>
  );
}
