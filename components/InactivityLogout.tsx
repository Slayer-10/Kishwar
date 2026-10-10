'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface InactivityLogoutProps {
  timeoutMs?: number;
}

const STORAGE_KEY = 'kishwar:lastActivity';
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const THROTTLE_MS = 5000; // Throttle storage writes to once per 5s

export function InactivityLogout({ timeoutMs = DEFAULT_TIMEOUT_MS }: InactivityLogoutProps) {
  const router = useRouter();
  const lastWrittenRef = useRef<number>(0);

  useEffect(() => {
    // Initialize lastActivity timestamp on mount so a fresh login never logs out immediately
    const now = Date.now();
    localStorage.setItem(STORAGE_KEY, now.toString());
    lastWrittenRef.current = now;

    const updateActivity = () => {
      const currentTime = Date.now();
      if (currentTime - lastWrittenRef.current >= THROTTLE_MS) {
        localStorage.setItem(STORAGE_KEY, currentTime.toString());
        lastWrittenRef.current = currentTime;
      }
    };

    const performLogout = async () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
      } catch {
        // ignore signout errors
      } finally {
        router.replace('/login?reason=inactive');
      }
    };

    const checkInactivity = () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      const lastActivity = raw ? parseInt(raw, 10) : lastWrittenRef.current;
      if (isNaN(lastActivity) || Date.now() - lastActivity >= timeoutMs) {
        performLogout();
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = setInterval(checkInactivity, 30000);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [timeoutMs, router]);

  return null;
}
