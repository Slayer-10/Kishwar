'use client';

import { useFormState } from 'react-dom';
import { resetPasswordAction } from '../actions';

const initialState = { error: undefined as string | undefined };

export default function ResetPasswordPage() {
  const [state, formAction] = useFormState(resetPasswordAction, initialState);

  return (
    <div className="mx-auto mt-24 max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">Set a new password</h1>
      {state?.error && (
        <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      <form action={formAction} className="flex flex-col gap-4">
        <input
          name="password"
          type="password"
          placeholder="New password"
          required
          minLength={6}
          className="rounded border p-2"
        />
        <button type="submit" className="rounded bg-slate-900 p-2 text-white">
          Update password
        </button>
      </form>
    </div>
  );
}
