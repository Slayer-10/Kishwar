import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="w-full flex flex-col gap-6 p-8 animate-pulse">
      <div
        className="w-[280px] h-[36px] rounded-[var(--radius-sm)]"
        style={{ backgroundColor: 'var(--color-divider)' }}
      />
      <div
        className="w-full h-[400px] rounded-[var(--radius-md)]"
        style={{ backgroundColor: 'var(--color-divider)' }}
      />
    </div>
  );
}
