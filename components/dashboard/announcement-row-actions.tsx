'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { togglePublishAnnouncementAction, deleteAnnouncementAction } from '@/app/(dashboard)/admin/actions';
import { Button } from '@/components/ui/Button';

export function AnnouncementRowActions({
  announcementId,
  isPublished,
}: {
  announcementId: string;
  isPublished: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleToggle() {
    startTransition(async () => {
      await togglePublishAnnouncementAction(announcementId, !isPublished);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm('Delete this announcement? This cannot be undone.')) return;

    startTransition(async () => {
      try {
        await deleteAnnouncementAction(announcementId);
        router.refresh();
      } catch (err: any) {
        alert(err.message ?? 'Failed to delete announcement.');
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button onClick={handleToggle} disabled={isPending} variant="secondary" size="sm">
        {isPublished ? 'Unpublish' : 'Publish'}
      </Button>
      <Button onClick={handleDelete} disabled={isPending} variant="danger" size="sm">
        Delete
      </Button>
    </div>
  );
}
