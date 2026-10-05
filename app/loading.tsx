import React from 'react';

export default function Loading() {
  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-8 gap-6 animate-pulse">
      <div
        className="w-[72px] h-[72px] rounded-full"
        style={{ backgroundColor: 'var(--color-divider)' }}
      />
      <div
        className="w-[200px] h-[28px] rounded-[var(--radius-sm)]"
        style={{ backgroundColor: 'var(--color-divider)' }}
      />
      <div
        className="w-[320px] h-[16px] rounded-[var(--radius-sm)]"
        style={{ backgroundColor: 'var(--color-divider)' }}
      />
    </div>
  );
}
