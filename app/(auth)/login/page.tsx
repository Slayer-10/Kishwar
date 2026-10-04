'use client';

import { Suspense } from 'react';
import { useFormState } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { signInAction } from '../actions';

const initialState = { error: undefined as string | undefined };

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '';
  const [state, formAction] = useFormState(signInAction, initialState);

  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : '/signup';

  return (
    <div className="mx-auto mt-24 max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">Log in to KISHWAR</h1>
      {state?.error && (
        <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      <form action={formAction} className="flex flex-col gap-4">
        {next && <input type="hidden" name="next" value={next} />}
        <input name="email" type="email" placeholder="Email" required className="rounded border p-2" />
        <input name="password" type="password" placeholder="Password" required className="rounded border p-2" />
        <button type="submit" className="rounded bg-slate-900 p-2 text-white">
          Log in
        </button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <a href={signupHref} className="text-slate-600 underline">Create account</a>
        <a href="/forgot-password" className="text-slate-600 underline">Forgot password?</a>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto mt-24 max-w-sm text-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
