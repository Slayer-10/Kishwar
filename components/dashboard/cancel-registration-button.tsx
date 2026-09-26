'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cancelRegistrationAction } from '@/app/(dashboard)/participant/actions';

export function CancelRegistrationButton({ registrationId }: { registrationId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleCancel() {
    if (!confirm('Cancel this registration? This cannot be undone.')) return;

    startTransition(async () => {
      try {
        await cancelRegistrationAction(registrationId);
        router.refresh();
      } catch (err: any) {
        alert(err.message ?? 'Failed to cancel registration.');
      }
    });
  }

  return (
    <button onClick={handleCancel} disabled={isPending} className="text-red-600 underline disabled:opacity-50">
      {isPending ? 'Cancelling...' : 'Cancel'}
    </button>
  );
}
