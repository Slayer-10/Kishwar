'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteAmbassadorAction } from '@/app/(dashboard)/admin/actions';

export function DeleteAmbassadorButton({ ambassadorId }: { ambassadorId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm('Delete this ambassador? This will also delete their login account and cannot be undone.')) return;

    startTransition(async () => {
      try {
        await deleteAmbassadorAction(ambassadorId);
        router.refresh();
      } catch (err: any) {
        alert(err.message ?? 'Failed to delete ambassador.');
      }
    });
  }

  return (
    <button onClick={handleDelete} disabled={isPending} className="text-red-600 underline disabled:opacity-50">
      {isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
