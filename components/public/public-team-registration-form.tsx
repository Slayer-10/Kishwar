'use client';

import React, { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { submitPublicTeamRegistrationAction } from '@/app/(public)/events/[id]/actions';
import type { PublicTeamRegistrationState } from '@/app/(public)/events/[id]/actions';

type UniversityOption = {
  id: string;
  name: string;
  hasActiveAmbassador: boolean;
};

const initialState: PublicTeamRegistrationState = {};

export function PublicTeamRegistrationForm({
  eventId,
  universities,
  minTeamSize,
  maxTeamSize,
}: {
  eventId: string;
  universities: UniversityOption[];
  minTeamSize: number;
  maxTeamSize: number;
}) {
  const [state, action] = useFormState(submitPublicTeamRegistrationAction, initialState);

  // Track captain university selection client-side to show/hide payment-proof field.
  const [captainUniversityId, setCaptainUniversityId] = useState('');
  const [accommodation, setAccommodation] = useState('NONE_OR_ALREADY_ARRANGED');

  // Extra member count (not counting the captain).
  // Start with minTeamSize - 1 additional members so the form is valid out of the box.
  const initialExtraMembers = Math.max(0, minTeamSize - 1);
  const [extraMemberCount, setExtraMemberCount] = useState(initialExtraMembers);

  const totalMembers = 1 + extraMemberCount; // captain + extras
  const canAddMember = totalMembers < maxTeamSize;
  const canRemoveMember = extraMemberCount > Math.max(0, minTeamSize - 1);

  const selectedCaptainUniversity = universities.find((u) => u.id === captainUniversityId);
  const needsPaymentProof = captainUniversityId !== '' &&
    (!selectedCaptainUniversity || !selectedCaptainUniversity.hasActiveAmbassador);

  return (
    <form
      action={action}
      className="mt-4 flex flex-col gap-5 rounded-[var(--radius-md)] border border-[var(--color-divider)] p-5 bg-[var(--color-surface)]"
    >
      {/* Hidden fields */}
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="memberCount" value={extraMemberCount} />

      {/* Header */}
      <div>
        <h4
          className="text-base font-bold uppercase text-[var(--color-text)]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Register your team
        </h4>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Team size: {minTeamSize}–{maxTeamSize} members (including captain). No participant
          account required. Seats are reserved only after review.
        </p>
      </div>

      {/* Team name */}
      <div>
        <label className="form-label" htmlFor={`teamName-${eventId}`}>
          Team name
        </label>
        <input
          id={`teamName-${eventId}`}
          name="teamName"
          type="text"
          required
          minLength={2}
          maxLength={120}
          placeholder="e.g. Cyber Crusaders"
          className="form-input"
        />
      </div>

      {/* ── Captain section ─────────────────────────────────────── */}
      <fieldset className="flex flex-col gap-4 rounded-[var(--radius-sm)] border-2 border-[var(--color-primary)] p-4">
        <legend
          className="px-2 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Team Captain
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label" htmlFor={`captainName-${eventId}`}>
              Full name
            </label>
            <input
              id={`captainName-${eventId}`}
              name="captainName"
              type="text"
              required
              maxLength={120}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label" htmlFor={`captainEmail-${eventId}`}>
              Email
            </label>
            <input
              id={`captainEmail-${eventId}`}
              name="captainEmail"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              className="form-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label" htmlFor={`captainPhone-${eventId}`}>
              Phone / WhatsApp
            </label>
            <input
              id={`captainPhone-${eventId}`}
              name="captainPhone"
              type="tel"
              required
              maxLength={30}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label" htmlFor={`captainCnic-${eventId}`}>
              CNIC / B-Form number
            </label>
            <input
              id={`captainCnic-${eventId}`}
              name="captainCnic"
              type="text"
              inputMode="numeric"
              placeholder="35202-1234567-1"
              required
              maxLength={20}
              className="form-input"
            />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              13-digit number. Dashes accepted.
            </p>
          </div>
        </div>

        <div>
          <label className="form-label" htmlFor={`captainUniversity-${eventId}`}>
            University / institute
          </label>
          <select
            id={`captainUniversity-${eventId}`}
            name="captainUniversityId"
            required
            value={captainUniversityId}
            onChange={(e) => setCaptainUniversityId(e.target.value)}
            className="form-input"
          >
            <option value="">Select university</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label" htmlFor={`captainStudentDoc-${eventId}`}>
            Student ID / student card image <span className="text-red-600">*</span>
          </label>
          <input
            id={`captainStudentDoc-${eventId}`}
            name="captainStudentDocument"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            required
            className="form-input"
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            PDF, JPG, PNG, or WEBP. Maximum 8 MB. Stored privately.
          </p>
        </div>
      </fieldset>

      {/* ── Additional members ──────────────────────────────────── */}
      {Array.from({ length: extraMemberCount }, (_, i) => (
        <fieldset
          key={i}
          className="flex flex-col gap-4 rounded-[var(--radius-sm)] border border-[var(--color-divider)] p-4"
        >
          <legend
            className="px-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Team Member {i + 1}
          </legend>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label" htmlFor={`memberName_${i}-${eventId}`}>
                Full name
              </label>
              <input
                id={`memberName_${i}-${eventId}`}
                name={`memberName_${i}`}
                type="text"
                required
                maxLength={120}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label" htmlFor={`memberEmail_${i}-${eventId}`}>
                Email
              </label>
              <input
                id={`memberEmail_${i}-${eventId}`}
                name={`memberEmail_${i}`}
                type="email"
                required
                maxLength={254}
                className="form-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label" htmlFor={`memberPhone_${i}-${eventId}`}>
                Phone / WhatsApp
              </label>
              <input
                id={`memberPhone_${i}-${eventId}`}
                name={`memberPhone_${i}`}
                type="tel"
                required
                maxLength={30}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label" htmlFor={`memberCnic_${i}-${eventId}`}>
                CNIC / B-Form number
              </label>
              <input
                id={`memberCnic_${i}-${eventId}`}
                name={`memberCnic_${i}`}
                type="text"
                inputMode="numeric"
                placeholder="35202-1234567-1"
                required
                maxLength={20}
                className="form-input"
              />
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor={`memberUniversity_${i}-${eventId}`}>
              University / institute
            </label>
            <select
              id={`memberUniversity_${i}-${eventId}`}
              name={`memberUniversityId_${i}`}
              required
              className="form-input"
            >
              <option value="">Select university</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor={`memberStudentDoc_${i}-${eventId}`}>
              Student ID / student card image <span className="text-red-600">*</span>
            </label>
            <input
              id={`memberStudentDoc_${i}-${eventId}`}
              name={`memberStudentDocument_${i}`}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              required
              className="form-input"
            />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              PDF, JPG, PNG, or WEBP. Maximum 8 MB. Stored privately.
            </p>
          </div>
        </fieldset>
      ))}

      {/* Add / remove member controls */}
      <div className="flex gap-3">
        {canAddMember && (
          <button
            type="button"
            onClick={() => setExtraMemberCount((c) => c + 1)}
            className="rounded-[var(--radius-pill)] border border-[var(--color-primary)] px-4 py-1.5 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors"
          >
            + Add member
          </button>
        )}
        {canRemoveMember && (
          <button
            type="button"
            onClick={() => setExtraMemberCount((c) => c - 1)}
            className="rounded-[var(--radius-pill)] border border-[var(--color-danger)] px-4 py-1.5 text-xs font-semibold text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white transition-colors"
          >
            − Remove last member
          </button>
        )}
        <span className="self-center text-xs text-[var(--color-text-muted)]">
          {totalMembers} / {maxTeamSize} members
        </span>
      </div>

      {/* ── Accommodation ───────────────────────────────────────── */}
      <div>
        <label className="form-label" htmlFor={`accommodation-team-${eventId}`}>
          Accommodation
        </label>
        <select
          id={`accommodation-team-${eventId}`}
          name="accommodationSelection"
          value={accommodation}
          onChange={(e) => setAccommodation(e.target.value)}
          required
          className="form-input"
        >
          <option value="NONE_OR_ALREADY_ARRANGED">None / I already have accommodation</option>
          <option value="THREE_DAY_STAY_WITH_FOOD">3-day stay with food</option>
        </select>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          No accommodation fee is added at this stage.
        </p>
      </div>

      {accommodation === 'THREE_DAY_STAY_WITH_FOOD' && (
        <div>
          <label className="form-label" htmlFor={`accommodationGender-team-${eventId}`}>
            Accommodation category
          </label>
          <select
            id={`accommodationGender-team-${eventId}`}
            name="accommodationGender"
            required
            defaultValue=""
            className="form-input"
          >
            <option value="">Select category</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </div>
      )}

      {/* ── Payment proof (shown when captain's university has no Ambassador) ── */}
      {needsPaymentProof && (
        <div>
          <label className="form-label" htmlFor={`paymentProof-team-${eventId}`}>
            Payment screenshot <span className="text-red-600">(required)</span>
          </label>
          <input
            id={`paymentProof-team-${eventId}`}
            name="paymentProof"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            required
            className="form-input"
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Your university has no active Ambassador. Upload payment evidence for Admin review.
            Maximum 8 MB.
          </p>
        </div>
      )}

      {/* Validation feedback */}
      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {state.error}
        </p>
      )}

      {state.success && (
        <p
          role="status"
          className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800"
        >
          {state.success}
        </p>
      )}

      <SubmitButton />

      <p className="text-xs text-[var(--color-text-muted)]">
        All documents are stored privately. Submitting does not reserve seats or generate an
        invoice. Your registration will be reviewed before a seat is confirmed.
      </p>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" className="w-full mt-2" disabled={pending}>
      {pending ? 'Submitting…' : 'Submit Team Registration'}
    </Button>
  );
}
