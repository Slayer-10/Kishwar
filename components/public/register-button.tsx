'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { registerForEventAction } from '@/app/(dashboard)/participant/actions';

export function RegisterButton({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRegister() {
    startTransition(async () => {
      try {
        await registerForEventAction(eventId);
        router.push('/participant');
      } catch (err: any) {
        alert(err.message ?? 'Failed to register.');
      }
    });
  }

  return (
    <button
      onClick={handleRegister}
      disabled={isPending}
      className="mt-8 w-full rounded-sm bg-[#E8A33D] px-6 py-3 text-sm font-semibold text-[#12141C] transition-colors duration-150 hover:bg-[#F2F0EA] disabled:opacity-50 sm:w-auto"
    >
      {isPending ? 'Registering...' : 'Register for this Event'}
    </button>
  );
}
