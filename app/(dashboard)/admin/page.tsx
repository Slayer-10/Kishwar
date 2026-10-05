import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { DeleteEventButton } from '@/components/dashboard/delete-event-button';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default async function AdminEventsPage() {
  const events = await prisma.event.findMany({ orderBy: { eventDate: 'asc' } });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
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
            Events
          </h1>
          <div
            className="mt-2 h-[4px] w-[56px] rounded-[2px]"
            style={{ backgroundColor: 'var(--color-primary)' }}
          />
        </div>

        <Button href="/admin/events/new" variant="primary">
          + Create Event
        </Button>
      </div>

      <div
        className="w-full overflow-x-auto rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]"
      >
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr
              style={{ backgroundColor: 'var(--color-secondary)', color: '#FFFFFF' }}
              className="font-heading text-xs uppercase tracking-wider h-[48px]"
            >
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">Category</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Deadline</th>
              <th className="px-5 py-3 font-semibold">Event Date</th>
              <th className="px-5 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-divider)]">
            {events.map((event) => (
              <tr
                key={event.id}
                className="h-[56px] transition-colors hover:bg-[rgba(106,172,220,0.08)]"
              >
                <td className="px-5 py-3 font-semibold text-[var(--color-text)]">{event.name}</td>
                <td className="px-5 py-3 text-[var(--color-text-muted)]">{event.category ?? '—'}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={event.status} />
                </td>
                <td className="px-5 py-3 text-[var(--color-text-muted)]">
                  {new Date(event.deadline).toLocaleDateString()}
                </td>
                <td className="px-5 py-3 text-[var(--color-text-muted)]">
                  {new Date(event.eventDate).toLocaleDateString()}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Button href={`/admin/events/${event.id}/edit`} variant="secondary" size="sm">
                      Edit
                    </Button>
                    <DeleteEventButton eventId={event.id} />
                  </div>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-[var(--color-text-muted)]">
                  No events yet. Create your first event.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
