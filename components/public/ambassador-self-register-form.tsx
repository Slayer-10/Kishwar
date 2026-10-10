'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import {
  registerSelfAction,
  type AmbassadorRegistrationState,
} from '@/app/(dashboard)/ambassador/actions';
import { Button } from '@/components/ui/Button';

type EventOption = {
  id: string;
  name: string;
  registrationType: string;
};

const initialState: AmbassadorRegistrationState = {};

export function AmbassadorSelfRegisterForm({
  eventId,
  events,
}: {
  eventId?: string;
  events?: EventOption[];
}) {
  const [state, action, pending] = useFormState(
    registerSelfAction,
    initialState
  );

  const [selectedEventId, setSelectedEventId] = useState(eventId || '');
  const [accommodation, setAccommodation] = useState('NONE_OR_ALREADY_ARRANGED');

  const eligibleEvents = events?.filter(
    (e) => e.registrationType !== 'TEAM'
  ) || [];

  return (
    <form
      action={action}
      className="mt-4 flex flex-col gap-4 rounded-[var(--radius-md)] border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-5 shadow-sm"
    >
      {eventId ? (
        <input type="hidden" name="eventId" value={eventId} />
      ) : (
        <div>
          <label className="form-label font-semibold">Select Event to Participate In</label>
          <select
            name="eventId"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            required
            className="form-input"
          >
            <option value="">-- Choose an Event --</option>
            {eligibleEvents.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.registrationType})
              </option>
            ))}
          </select>
        </div>
      )}

      <p
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary)' }}
        className="text-base font-bold uppercase"
      >
        Register Yourself as a Participant
      </p>

      <div>
        <label className="form-label font-semibold">Your CNIC / B-Form Number</label>
        <input
          name="participantCnic"
          type="text"
          required
          placeholder="35202-1234567-1"
          className="form-input"
        />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          As an Ambassador, you can participate in this event.
        </p>
      </div>

      <div>
        <label className="form-label font-semibold">
          Your Student ID Photo / Document <span className="text-red-600">*</span>
        </label>
        <input
          name="studentDocument"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          required
          className="form-input text-xs"
        />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Mandatory. Upload Student ID Card or Verification letter (PDF, JPG, PNG, WEBP — max 8MB).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="form-label font-semibold">Accommodation</label>
          <select
            name="accommodationSelection"
            value={accommodation}
            onChange={(e) => setAccommodation(e.target.value)}
            className="form-input"
          >
            <option value="NONE_OR_ALREADY_ARRANGED">None / Self Arranged</option>
            <option value="THREE_DAY_STAY_WITH_FOOD">3-Day Stay with Food</option>
          </select>
        </div>

        {accommodation === 'THREE_DAY_STAY_WITH_FOOD' && (
          <div>
            <label className="form-label font-semibold">Accommodation Category</label>
            <select name="accommodationGender" required className="form-input">
              <option value="">Select Category</option>
              <option value="MALE">Male Hostel</option>
              <option value="FEMALE">Female Hostel</option>
            </select>
          </div>
        )}
      </div>

      {state.error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs font-medium">
          {state.error}
        </div>
      )}

      {state.success && (
        <div role="status" className="p-3 bg-green-50 border border-green-200 text-green-700 rounded text-xs font-medium">
          {state.success}
        </div>
      )}

      <Button type="submit" variant="primary" className="w-full mt-2" disabled={pending}>
        {pending ? 'Registering Myself...' : 'Register Myself'}
      </Button>
    </form>
  );
}
