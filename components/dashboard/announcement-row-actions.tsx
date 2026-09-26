'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { togglePublishAnnouncementAction, deleteAnnouncementAction } from '@/app/(dashboard)/admin/actions';

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
    <div className="flex gap-3 text-sm">
      <button onClick={handleToggle} disabled={isPending} className="text-blue-600 underline disabled:opacity-50">
        {isPublished ? 'Unpublish' : 'Publish'}
      </button>
      <button onClick={handleDelete} disabled={isPending} className="text-red-600 underline disabled:opacity-50">
        Delete
      </button>
    </div>
  );
}
