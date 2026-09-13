'use client';

import { useFormState } from 'react-dom';
import { forgotPasswordAction } from '../actions';

const initialState = { error: undefined as string | undefined, success: false };

export default function ForgotPasswordPage() {
  const [state, formAction] = useFormState(forgotPasswordAction, initialState);

  if (state?.success) {
    return (
      <div className="mx-auto mt-24 max-w-sm text-center">
        <h1 className="mb-4 text-2xl font-bold">Check your email</h1>
        <p className="text-slate-600">
          If an account exists with that email, we&apos;ve sent a password reset link.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-24 max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">Reset your password</h1>
      {state?.error && (
        <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      <form action={formAction} className="flex flex-col gap-4">
        <input name="email" type="email" placeholder="Email" required className="rounded border p-2" />
        <button type="submit" className="rounded bg-slate-900 p-2 text-white">
          Send reset link
        </button>
      </form>
      <div className="mt-4 text-sm">
        <a href="/login" className="text-slate-600 underline">Back to login</a>
      </div>
    </div>
  );
}
