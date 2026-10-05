import React from 'react';

export default function EventsLoading() {
  return (
    <div className="w-full flex flex-col gap-8 p-8 max-w-[1200px] mx-auto animate-pulse">
      <div
        className="w-[240px] h-[36px] rounded-[var(--radius-sm)]"
        style={{ backgroundColor: 'var(--color-divider)' }}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-[260px] rounded-[var(--radius-md)] p-6 flex flex-col gap-4"
            style={{ backgroundColor: 'var(--color-divider)' }}
          />
        ))}
      </div>
    </div>
  );
}
