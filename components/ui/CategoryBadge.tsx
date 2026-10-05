import React from 'react';
import { getCategoryColor } from '@/lib/theme';

interface CategoryBadgeProps {
  category?: string | null;
  className?: string;
}

export function CategoryBadge({ category, className = '' }: CategoryBadgeProps) {
  const bg = getCategoryColor(category);

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full uppercase font-medium ${className}`}
      style={{
        backgroundColor: bg,
        color: '#FFFFFF',
        fontFamily: 'var(--font-heading)',
        fontSize: 'var(--fs-caption1)',
        lineHeight: 'var(--lh-caption1)',
        padding: '4px 12px',
      }}
    >
      {category ?? 'General'}
    </span>
  );
}
