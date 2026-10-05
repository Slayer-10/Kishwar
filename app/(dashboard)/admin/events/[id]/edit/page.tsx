import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { EventForm } from '@/components/dashboard/event-form';
import { updateEventAction } from '@/app/(dashboard)/admin/actions';

function toDateTimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const event = await prisma.event.findUnique({ where: { id: params.id } });

  if (!event) notFound();

  const boundAction = updateEventAction.bind(null, event.id);

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
          Edit Event
        </h1>
        <div
          className="mt-2 h-[4px] w-[56px] rounded-[2px]"
          style={{ backgroundColor: 'var(--color-primary)' }}
        />
      </div>

      <EventForm
        action={boundAction}
        submitLabel="Save Changes"
        initialValues={{
          name: event.name,
          description: event.description ?? '',
          category: event.category ?? '',
          registrationFee: event.registrationFee.toString(),
          prizeMoney: event.prizeMoney?.toString() ?? '',
          registrationType: event.registrationType,
          minTeamSize: event.minTeamSize?.toString() ?? '',
          maxTeamSize: event.maxTeamSize?.toString() ?? '',
          deadline: toDateTimeLocal(event.deadline),
          eventDate: toDateTimeLocal(event.eventDate),
          venue: event.venue ?? '',
          rules: event.rules ?? '',
          status: event.status,
        }}
      />
    </div>
  );
}
