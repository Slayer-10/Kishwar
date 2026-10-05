import React from 'react';
import { siteConfig } from '@/lib/site-config';

export function Marquee() {
  const items = siteConfig.tickerItems ?? [];
  // Duplicate array so ticker flows seamlessly
  const marqueeList = [...items, ...items, ...items, ...items];

  return (
    <div
      className="relative w-full overflow-hidden flex items-center"
      style={{
        height: '48px',
        backgroundColor: 'var(--color-primary)',
        color: '#FFFFFF',
        fontFamily: 'var(--font-heading)',
        fontSize: '16px',
        textTransform: 'uppercase',
      }}
    >
      <div className="animate-marquee items-center gap-6 whitespace-nowrap">
        {marqueeList.map((item, idx) => (
          <React.Fragment key={idx}>
            <span className="tracking-wider">{item}</span>
            <span style={{ color: 'var(--color-primary)' }} className="opacity-80 select-none">
              ◆
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
