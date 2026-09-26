'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteUniversityAction } from '@/app/(dashboard)/admin/actions';

export function DeleteUniversityButton({ universityId }: { universityId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm('Delete this university? This cannot be undone.')) return;

    startTransition(async () => {
      try {
        await deleteUniversityAction(universityId);
        router.refresh();
      } catch (err: any) {
        alert(err.message ?? 'Failed to delete university.');
      }
    });
  }

  return (
    <button onClick={handleDelete} disabled={isPending} className="text-red-600 underline disabled:opacity-50">
      {isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
