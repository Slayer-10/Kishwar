'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteAmbassadorAction } from '@/app/(dashboard)/admin/actions';
import { Button } from '@/components/ui/Button';

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
    <Button onClick={handleDelete} disabled={isPending} variant="danger" size="sm">
      {isPending ? 'Deleting...' : 'Delete'}
    </Button>
  );
}
