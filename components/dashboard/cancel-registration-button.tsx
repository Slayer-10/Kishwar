'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cancelRegistrationAction } from '@/app/(dashboard)/participant/actions';
import { Button } from '@/components/ui/Button';

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
    <Button onClick={handleCancel} disabled={isPending} variant="danger" size="sm">
      {isPending ? 'Cancelling...' : 'Cancel'}
    </Button>
  );
}
