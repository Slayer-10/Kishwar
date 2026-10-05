'use client';

import { Suspense } from 'react';
import { useFormState } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { signUpAction } from '../actions';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';

const initialState = { error: undefined as string | undefined };

function SignupForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '';
  const [state, formAction] = useFormState(signUpAction, initialState);

  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : '/login';

  return (
    <AuthShell
      title="Create Account"
      subtitle="Register your KISHWAR 26 account to join competitions."
      footer={
        <div className="flex justify-between items-center text-sm font-semibold">
          <a href={loginHref} style={{ color: 'var(--color-primary)' }} className="hover:underline">
            Already have an account? Log in
          </a>
        </div>
      }
    >
      {state?.error && <div className="form-error">{state.error}</div>}

      <form action={formAction} className="flex flex-col gap-4">
        {next && <input type="hidden" name="next" value={next} />}

        <div>
          <label className="form-label">Full Name</label>
          <input
            name="fullName"
            type="text"
            placeholder="John Doe"
            required
            className="form-input"
          />
        </div>

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
            placeholder="Minimum 6 characters"
            required
            minLength={6}
            className="form-input"
          />
        </div>

        <Button type="submit" variant="primary" className="w-full mt-2">
          Sign up
        </Button>
      </form>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-6 text-base font-semibold text-[var(--color-text-muted)]">
          Loading...
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
