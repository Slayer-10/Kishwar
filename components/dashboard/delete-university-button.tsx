'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteUniversityAction } from '@/app/(dashboard)/admin/actions';
import { Button } from '@/components/ui/Button';

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
    <Button onClick={handleDelete} disabled={isPending} variant="danger" size="sm">
      {isPending ? 'Deleting...' : 'Delete'}
    </Button>
  );
}
