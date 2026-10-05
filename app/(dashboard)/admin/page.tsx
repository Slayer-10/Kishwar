import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { DeleteEventButton } from '@/components/dashboard/delete-event-button';

export const dynamic = 'force-dynamic';

export default async function AdminEventsPage() {
  const events = await prisma.event.findMany({ orderBy: { eventDate: 'asc' } });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        <Link href="/admin/events/new" className="rounded bg-slate-900 px-4 py-2 text-white">
          + Create Event
        </Link>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Name</th>
            <th className="p-2">Category</th>
            <th className="p-2">Status</th>
            <th className="p-2">Deadline</th>
            <th className="p-2">Event Date</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b">
              <td className="p-2">{event.name}</td>
              <td className="p-2">{event.category ?? '—'}</td>
              <td className="p-2">{event.status}</td>
              <td className="p-2">{event.deadline.toLocaleString()}</td>
              <td className="p-2">{event.eventDate.toLocaleString()}</td>
              <td className="flex gap-3 p-2">
                <Link href={`/admin/events/${event.id}/edit`} className="text-blue-600 underline">
                  Edit
                </Link>
                <DeleteEventButton eventId={event.id} />
              </td>
            </tr>
          ))}
          {events.length === 0 && (
            <tr>
              <td colSpan={6} className="p-4 text-center text-slate-500">
                No events yet. Create your first event.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
