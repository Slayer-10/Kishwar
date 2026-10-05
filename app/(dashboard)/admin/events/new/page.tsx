import React from 'react';
import { EventForm } from '@/components/dashboard/event-form';
import { createEventAction } from '@/app/(dashboard)/admin/actions';

export default function NewEventPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col">
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--fs-title1)',
            lineHeight: 'var(--lh-title1)',
            color: 'var(--color-text)',
          }}
          className="font-bold uppercase tracking-tight"
        >
          Create Event
        </h1>
        <div
          className="mt-2 h-[4px] w-[56px] rounded-[2px]"
          style={{ backgroundColor: 'var(--color-primary)' }}
        />
      </div>

      <EventForm action={createEventAction} submitLabel="Create Event" />
    </div>
  );
}
