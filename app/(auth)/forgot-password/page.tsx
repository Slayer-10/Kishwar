'use client';

import { useFormState } from 'react-dom';
import { forgotPasswordAction } from '../actions';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';

const initialState = { error: undefined as string | undefined, success: false };

export default function ForgotPasswordPage() {
  const [state, formAction] = useFormState(forgotPasswordAction, initialState);

  if (state?.success) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="Password reset link sent successfully."
        footer={
          <div className="flex justify-between items-center text-sm font-semibold">
            <a href="/login" style={{ color: 'var(--color-primary)' }} className="hover:underline">
              Back to login
            </a>
          </div>
        }
      >
        <div
          className="p-4 rounded-[var(--radius-sm)] border-l-4 text-sm"
          style={{
            borderColor: 'var(--color-success)',
            backgroundColor: 'rgba(45, 125, 70, 0.08)',
            color: 'var(--color-success)',
          }}
        >
          If an account exists with that email, we&apos;ve sent a password reset link. Please check your inbox.
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset Password"
      subtitle="Enter your registered email to receive a password reset link."
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
          <label className="form-label">Email Address</label>
          <input
            name="email"
            type="email"
            placeholder="email@example.com"
            required
            className="form-input"
          />
        </div>

        <Button type="submit" variant="primary" className="w-full mt-2">
          Send reset link
        </Button>
      </form>
    </AuthShell>
  );
}
