'use client';

import React, { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import {
  approveAmbassadorRequestAction,
  type AmbassadorApprovalResult,
} from '@/app/(dashboard)/admin/actions';
import { Button } from '@/components/ui/Button';

interface UniversityOption {
  id: string;
  name: string;
  city: string | null;
}

interface ApproveAmbassadorFormProps {
  requestId: string;
  defaultUniversityId?: string | null;
  universities: UniversityOption[];
  assignedUniversityIds: string[];
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="success" size="sm" disabled={pending}>
      {pending ? 'Approving...' : 'Approve Ambassador'}
    </Button>
  );
}

export function ApproveAmbassadorForm({
  requestId,
  defaultUniversityId,
  universities,
  assignedUniversityIds,
}: ApproveAmbassadorFormProps) {
  const [state, formAction] = useFormState<AmbassadorApprovalResult | null, FormData>(
    approveAmbassadorRequestAction,
    null
  );
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const assignedSet = new Set(assignedUniversityIds);

  const handleCopyPassword = async () => {
    if (state?.credentials?.password) {
      try {
        await navigator.clipboard.writeText(state.credentials.password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy password to clipboard', err);
      }
    }
  };

  if (state?.credentials && !dismissed) {
    return (
      <div className="flex max-w-xl flex-col gap-4 p-5 rounded-[var(--radius-md)] border-2 border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/20">
        <div className="flex items-center justify-between border-b border-[var(--color-divider)] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              ✓
            </span>
            <h4
              style={{ fontFamily: 'var(--font-heading)' }}
              className="text-sm font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400"
            >
              Ambassador Approved
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>

        <div className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-[var(--color-divider)] bg-[var(--color-surface)] p-4 shadow-sm">
          <div>
            <span className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
              Login Email
            </span>
            <p className="font-mono text-sm font-semibold text-[var(--color-text)] select-all mt-0.5">
              {state.credentials.email}
            </p>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
              Ambassador Code
            </span>
            <p className="font-mono text-sm font-semibold text-[var(--color-text)] select-all mt-0.5">
              {state.credentials.ambassadorCode}
            </p>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
              Login Password
            </span>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <span className="font-mono text-base font-bold tracking-wider px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-background)] border border-[var(--color-divider)] text-[var(--color-text)] select-all">
                {state.credentials.password}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopyPassword}
              >
                {copied ? 'Copied!' : 'Copy Password'}
              </Button>
            </div>
          </div>
        </div>

        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium leading-relaxed">
          ⚠️ Please share these credentials securely with the ambassador. The password is stored encrypted and can also be viewed or reset from the Ambassadors management page by a Super Admin.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex max-w-xl flex-col gap-4 p-5 rounded-[var(--radius-md)] border border-[var(--color-divider)] bg-[var(--color-background)]"
    >
      <input type="hidden" name="requestId" value={requestId} />

      {state?.error && (
        <div className="p-3 rounded-[var(--radius-sm)] bg-red-500/10 border border-red-500 text-red-600 dark:text-red-400 text-sm font-medium">
          {state.error}
        </div>
      )}

      <div>
        <label className="form-label">Assign University</label>
        <select
          name="universityId"
          required
          defaultValue={defaultUniversityId ?? ''}
          className="form-input"
        >
          <option value="">Select University</option>
          {universities.map((university) => {
            const isTaken = assignedSet.has(university.id);
            return (
              <option key={university.id} value={university.id} disabled={isTaken}>
                {university.name}
                {university.city ? ` (${university.city})` : ''}
                {isTaken ? ' (already has an ambassador)' : ''}
              </option>
            );
          })}
        </select>
      </div>

      <div>
        <label className="form-label">Ambassador Code</label>
        <input
          name="ambassadorCode"
          required
          placeholder="e.g. AMB-FAST-001"
          className="form-input"
        />
      </div>

      <div>
        <label className="form-label">Login Password</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className="form-input"
        />
      </div>

      <div className="mt-2 flex items-center gap-3">
        <SubmitButton />
      </div>
    </form>
  );
}
