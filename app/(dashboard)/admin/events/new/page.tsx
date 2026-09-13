import { EventForm } from '@/components/dashboard/event-form';
import { createEventAction } from '@/app/(dashboard)/admin/actions';

export default function NewEventPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Create Event</h1>
      <EventForm action={createEventAction} submitLabel="Create Event" />
    </div>
  );
}
