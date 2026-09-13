'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteEventAction } from '@/app/(dashboard)/admin/actions';

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm('Delete this event? This cannot be undone.')) return;

    startTransition(async () => {
      try {
        await deleteEventAction(eventId);
        router.refresh();
      } catch (err: any) {
        alert(err.message ?? 'Failed to delete event.');
      }
    });
  }

  return (
    <button onClick={handleDelete} disabled={isPending} className="text-red-600 underline disabled:opacity-50">
      {isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
