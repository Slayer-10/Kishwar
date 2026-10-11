'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { resetAmbassadorPasswordAction } from '@/app/(dashboard)/admin/actions';
import { Button } from '@/components/ui/Button';

interface AmbassadorPasswordCellProps {
  ambassadorId: string;
  ambassadorCode: string;
  savedPassword: string | null;
}

export function AmbassadorPasswordCell({
  ambassadorId,
  ambassadorCode,
  savedPassword,
}: AmbassadorPasswordCellProps) {
  const [copied, setCopied] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCopy = async () => {
    if (!savedPassword) return;
    try {
      await navigator.clipboard.writeText(savedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('ambassadorId', ambassadorId);
      formData.append('newPassword', newPassword);

      const res = await resetAmbassadorPasswordAction(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess('Password updated successfully.');
        setNewPassword('');
        setTimeout(() => {
          setIsModalOpen(false);
          setSuccess(null);
        }, 1200);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {savedPassword ? (
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="rounded bg-[var(--color-background)] px-2 py-1 font-semibold border border-[var(--color-divider)] select-all">
              {isRevealed ? savedPassword : '••••••••'}
            </span>
            <button
              type="button"
              onClick={() => setIsRevealed(!isRevealed)}
              className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] underline cursor-pointer"
              title={isRevealed ? 'Hide password' : 'Show password'}
            >
              {isRevealed ? 'Hide' : 'Show'}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="text-[11px] text-[var(--color-primary)] hover:underline cursor-pointer font-medium ml-1"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        ) : (
          <span className="inline-flex items-center rounded bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            Not saved — reset required
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            setIsModalOpen(true);
            setError(null);
            setSuccess(null);
          }}
          className="text-xs text-[var(--color-secondary)] hover:underline cursor-pointer font-medium ml-1"
        >
          {savedPassword ? 'Reset' : 'Set Password'}
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[var(--radius-md)] border border-[var(--color-divider)] bg-[var(--color-surface)] p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--color-divider)] pb-3">
              <h3
                style={{ fontFamily: 'var(--font-heading)' }}
                className="text-base font-bold uppercase tracking-wide text-[var(--color-text)]"
              >
                Reset Password — {ambassadorCode}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Enter a new login password for this ambassador (minimum 8 characters). This will update their Supabase Auth login and save the encrypted password for future administrative reference.
            </p>

            {error && (
              <div className="rounded p-3 text-xs bg-red-500/10 border border-red-500 text-red-600 dark:text-red-400 font-medium">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded p-3 text-xs bg-emerald-500/10 border border-emerald-500 text-emerald-600 dark:text-emerald-400 font-medium">
                {success}
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
              <div>
                <label className="form-label text-xs">New Login Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-input text-sm"
                  disabled={isPending}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isPending || newPassword.length < 8}
                >
                  {isPending ? 'Updating...' : 'Save Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
