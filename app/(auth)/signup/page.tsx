'use client';

import { Suspense } from 'react';
import { useFormState } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { signUpAction } from '../actions';

const initialState = { error: undefined as string | undefined };

function SignupForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '';
  const [state, formAction] = useFormState(signUpAction, initialState);

  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : '/login';

  return (
    <div className="mx-auto mt-24 max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">Create your KISHWAR account</h1>
      {state?.error && (
        <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      <form action={formAction} className="flex flex-col gap-4">
        {next && <input type="hidden" name="next" value={next} />}
        <input name="fullName" type="text" placeholder="Full name" required className="rounded border p-2" />
        <input name="email" type="email" placeholder="Email" required className="rounded border p-2" />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          minLength={6}
          className="rounded border p-2"
        />
        <button type="submit" className="rounded bg-slate-900 p-2 text-white">
          Sign up
        </button>
      </form>
      <div className="mt-4 text-sm">
        <a href={loginHref} className="text-slate-600 underline">Already have an account? Log in</a>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="mx-auto mt-24 max-w-sm text-center">Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}
