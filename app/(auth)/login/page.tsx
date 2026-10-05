'use client';

import { Suspense } from 'react';
import { useFormState } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { signInAction } from '../actions';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';

const initialState = { error: undefined as string | undefined };

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '';
  const [state, formAction] = useFormState(signInAction, initialState);

  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : '/signup';

  return (
    <AuthShell
      title="Log in"
      subtitle="Welcome back! Enter your details to continue."
      footer={
        <div className="flex flex-wrap justify-between items-center text-sm font-semibold gap-2">
          <a href={signupHref} style={{ color: 'var(--color-primary)' }} className="hover:underline">
            Don&apos;t have an account? Sign up
          </a>
          <a
            href="/forgot-password"
            style={{ color: 'var(--color-text-muted)' }}
            className="hover:underline font-normal text-xs"
          >
            Forgot password?
          </a>
        </div>
      }
    >
      {state?.error && <div className="form-error">{state.error}</div>}

      <form action={formAction} className="flex flex-col gap-4">
        {next && <input type="hidden" name="next" value={next} />}

        <div>
          <label className="form-label">Email Address</label>
          <input
            name="email"
            type="email"
            placeholder="email@example.com"
            required
            className="form-input"
          />
        </div>

        <div>
          <label className="form-label">Password</label>
          <input
            name="password"
            type="password"
            placeholder="••••••••"
            required
            className="form-input"
          />
        </div>

        <Button type="submit" variant="primary" className="w-full mt-2">
          Log in
        </Button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-6 text-base font-semibold text-[var(--color-text-muted)]">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
