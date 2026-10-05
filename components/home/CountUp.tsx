'use client';

import React, { useState, useEffect, useRef } from 'react';

interface CountUpProps {
  targetValue: number;
  label: string;
  prefix?: string;
  suffix?: string;
  formattedDisplay?: string; // Optional override if original stat is a string like "2,000+" or "PKR 500,000+"
}

export function CountUp({
  targetValue,
  label,
  prefix = '',
  suffix = '',
  formattedDisplay,
}: CountUpProps) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);

          if (targetValue === 0) {
            setCount(0);
            return;
          }

          const duration = 1200; // 1.2s
          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out quad
            const easeProgress = 1 - (1 - progress) * (1 - progress);
            const currentCount = Math.floor(easeProgress * targetValue);

            setCount(currentCount);

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setCount(targetValue);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.2 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [targetValue, hasAnimated]);

  const renderValue = () => {
    if (!hasAnimated) return `${prefix}0${suffix}`;

    if (formattedDisplay && targetValue > 0) {
      // If we have a formatted display, scale proportionally or show final formatted value
      if (count === targetValue) return formattedDisplay;
      return `${prefix}${count.toLocaleString()}${suffix}`;
    }

    return `${prefix}${count.toLocaleString()}${suffix}`;
  };

  return (
    <div
      ref={elementRef}
      className="flex flex-col items-start p-7 rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-hover)]"
    >
      <span
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'var(--fs-large)',
          lineHeight: 'var(--lh-large)',
          color: 'var(--color-primary)',
        }}
        className="font-bold"
      >
        {renderValue()}
      </span>
      <span
        style={{
          fontSize: 'var(--fs-footnote)',
          lineHeight: 'var(--lh-footnote)',
          color: 'var(--color-text-muted)',
          marginTop: '6px',
        }}
        className="font-medium"
      >
        {label}
      </span>
    </div>
  );
}
