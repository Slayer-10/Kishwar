'use client';

import { useFormState } from 'react-dom';
import { resetPasswordAction } from '../actions';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';

const initialState = { error: undefined as string | undefined };

export default function ResetPasswordPage() {
  const [state, formAction] = useFormState(resetPasswordAction, initialState);

  return (
    <AuthShell
      title="Set New Password"
      subtitle="Enter your new password below."
      footer={
        <div className="flex justify-between items-center text-sm font-semibold">
          <a href="/login" style={{ color: 'var(--color-primary)' }} className="hover:underline">
            Back to login
          </a>
        </div>
      }
    >
      {state?.error && <div className="form-error">{state.error}</div>}

      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <label className="form-label">New Password</label>
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
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}
