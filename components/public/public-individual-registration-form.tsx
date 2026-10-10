'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  submitPublicIndividualRegistrationAction,
  type PublicRegistrationState,
} from '@/app/(public)/events/[id]/actions';

type UniversityOption = {
  id: string;
  name: string;
  hasActiveAmbassador: boolean;
};

const initialState: PublicRegistrationState = {};

export function PublicIndividualRegistrationForm({
  eventId,
  universities,
}: {
  eventId: string;
  universities: UniversityOption[];
}) {
  const [state, action, pending] = useActionState(
    submitPublicIndividualRegistrationAction,
    initialState
  );

  const [universityId, setUniversityId] = useState('');
  const [otherUniversityName, setOtherUniversityName] = useState('');
  const [accommodation, setAccommodation] = useState(
    'NONE_OR_ALREADY_ARRANGED'
  );

  const selectedUniversity = universities.find(
    (university) => university.id === universityId
  );

  const isOtherUniversity = universityId === '__other__';
  const needsPaymentProof =
    isOtherUniversity ||
    (!!selectedUniversity && !selectedUniversity.hasActiveAmbassador);

  return (
    <form
      action={action}
      className="mt-4 flex flex-col gap-4 rounded-[var(--radius-md)] border border-[var(--color-divider)] p-5 bg-[var(--color-surface)]"
    >
      <input type="hidden" name="eventId" value={eventId} />

      <div>
        <h4
          className="text-base font-bold uppercase text-[var(--color-text)]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Register for this event
        </h4>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          No participant account is required. Your registration will be reviewed
          before a seat is reserved.
        </p>
      </div>

      <div>
        <label className="form-label" htmlFor={`name-${eventId}`}>
          Full name
        </label>
        <input
          id={`name-${eventId}`}
          name="fullName"
          type="text"
          autoComplete="name"
          required
          maxLength={120}
          className="form-input"
        />
      </div>

      <div>
        <label className="form-label" htmlFor={`email-${eventId}`}>
          Email
        </label>
        <input
          id={`email-${eventId}`}
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          className="form-input"
        />
      </div>

      <div>
        <label className="form-label" htmlFor={`phone-${eventId}`}>
          Phone number
        </label>
        <input
          id={`phone-${eventId}`}
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          maxLength={30}
          className="form-input"
        />
      </div>

      <div>
        <label className="form-label" htmlFor={`cnic-${eventId}`}>
          CNIC / B-Form number
        </label>
        <input
          id={`cnic-${eventId}`}
          name="cnic"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="35202-1234567-1"
          required
          maxLength={20}
          className="form-input"
        />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Enter the 13-digit number. Dashes are accepted.
        </p>
      </div>

      <div>
        <label className="form-label" htmlFor={`university-${eventId}`}>
          University / institute
        </label>
        <select
          id={`university-${eventId}`}
          name="universityId"
          value={universityId}
          onChange={(event) => setUniversityId(event.target.value)}
          required
          className="form-input"
        >
          <option value="">Select your university</option>
          {universities.map((university) => (
            <option key={university.id} value={university.id}>
              {university.name}
            </option>
          ))}
          <option value="__other__">Other / not listed</option>
        </select>
      </div>

      {isOtherUniversity && (
        <div>
          <label
            className="form-label"
            htmlFor={`other-university-${eventId}`}
          >
            Enter university / institute name
          </label>
          <input
            id={`other-university-${eventId}`}
            name="otherUniversityName"
            type="text"
            value={otherUniversityName}
            onChange={(event) => setOtherUniversityName(event.target.value)}
            required
            minLength={2}
            maxLength={120}
            className="form-input"
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            If no active Ambassador is assigned to this university, payment
            evidence is required.
          </p>
        </div>
      )}

      <div>
        <label className="form-label" htmlFor={`student-doc-${eventId}`}>
          Student verification document
        </label>
        <input
          id={`student-doc-${eventId}`}
          name="studentDocument"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          required
          className="form-input"
        />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          PDF, JPG, PNG, or WEBP. Maximum 8 MB. Stored privately.
        </p>
      </div>

      <div>
        <label className="form-label" htmlFor={`payment-proof-${eventId}`}>
          Payment screenshot {needsPaymentProof ? '(required)' : '(if applicable)'}
        </label>
        <input
          id={`payment-proof-${eventId}`}
          name="paymentProof"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          required={needsPaymentProof}
          className="form-input"
        />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {needsPaymentProof
            ? 'Your university has no active Ambassador. Upload payment evidence for Admin review.'
            : 'If an active Ambassador is available, payment evidence is not required at this stage.'}
          {' '}Maximum 8 MB.
        </p>
      </div>

      <div>
        <label className="form-label" htmlFor={`accommodation-${eventId}`}>
          Accommodation
        </label>
        <select
          id={`accommodation-${eventId}`}
          name="accommodationSelection"
          value={accommodation}
          onChange={(event) => setAccommodation(event.target.value)}
          className="form-input"
          required
        >
          <option value="NONE_OR_ALREADY_ARRANGED">
            None / I already have accommodation
          </option>
          <option value="THREE_DAY_STAY_WITH_FOOD">
            3-day stay with food
          </option>
        </select>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          No accommodation fee is added at this stage.
        </p>
      </div>

      {accommodation === 'THREE_DAY_STAY_WITH_FOOD' && (
        <div>
          <label
            className="form-label"
            htmlFor={`accommodation-gender-${eventId}`}
          >
            Accommodation category
          </label>
          <select
            id={`accommodation-gender-${eventId}`}
            name="accommodationGender"
            required
            className="form-input"
            defaultValue=""
          >
            <option value="">Select category</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </div>
      )}

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

      <Button
        type="submit"
        variant="primary"
        className="w-full mt-2"
        disabled={pending}
      >
        {pending ? 'Submitting…' : 'Submit Registration'}
      </Button>

      <p className="text-xs text-[var(--color-text-muted)]">
        Your documents are stored privately. Submission does not reserve a seat
        and does not generate an invoice.
      </p>
    </form>
  );
}
