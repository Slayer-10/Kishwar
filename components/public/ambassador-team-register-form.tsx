'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import {
  registerTeamAction,
  type AmbassadorRegistrationState,
} from '@/app/(dashboard)/ambassador/actions';
import { Button } from '@/components/ui/Button';

type EventOption = {
  id: string;
  name: string;
  registrationType: string;
  minTeamSize?: number | null;
  maxTeamSize?: number | null;
};

const initialState: AmbassadorRegistrationState = {};

export function AmbassadorTeamRegisterForm({
  eventId,
  minTeamSize,
  maxTeamSize,
  events,
}: {
  eventId?: string;
  minTeamSize?: number | null;
  maxTeamSize?: number | null;
  events?: EventOption[];
}) {
  const [state, action, pending] = useFormState(
    registerTeamAction,
    initialState
  );

  const [selectedEventId, setSelectedEventId] = useState(eventId || '');
  const [accommodation, setAccommodation] = useState('NONE_OR_ALREADY_ARRANGED');

  const selectedEvent = events?.find((e) => e.id === selectedEventId);
  const lower = minTeamSize ?? selectedEvent?.minTeamSize ?? 2;
  const upper = maxTeamSize ?? selectedEvent?.maxTeamSize ?? Math.max(lower, 10);

  const sizeOptions = Array.from(
    { length: Math.max(1, upper - lower + 1) },
    (_, i) => lower + i
  );

  const [teamSize, setTeamSize] = useState(lower);
  const teammateCount = Math.max(0, teamSize - 1);

  const eligibleEvents = events?.filter(
    (e) => e.registrationType !== 'INDIVIDUAL'
  ) || [];

  return (
    <form
      action={action}
      className="mt-4 flex flex-col gap-4 rounded-[var(--radius-md)] border border-[var(--color-divider)] p-5 bg-[var(--color-surface)] shadow-sm"
    >
      {eventId ? (
        <input type="hidden" name="eventId" value={eventId} />
      ) : (
        <div>
          <label className="form-label font-semibold">Select Team Event</label>
          <select
            name="eventId"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            required
            className="form-input"
          >
            <option value="">-- Choose a Team Event --</option>
            {eligibleEvents.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.registrationType})
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="form-label font-semibold">Team Name</label>
        <input
          name="teamName"
          type="text"
          required
          placeholder="Cyber Crusaders"
          className="form-input"
        />
      </div>

      {/* Captain Section */}
      <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-3">
        <h4 className="font-bold text-xs uppercase tracking-wide text-indigo-700">
          Team Captain Details
        </h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label text-xs font-semibold">Captain Full Name</label>
            <input
              name="captainName"
              type="text"
              required
              placeholder="Captain Name"
              className="form-input text-xs"
            />
          </div>
          <div>
            <label className="form-label text-xs font-semibold">Captain Email</label>
            <input
              name="captainEmail"
              type="email"
              required
              placeholder="captain@example.com"
              className="form-input text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label text-xs font-semibold">Captain Phone</label>
            <input
              name="captainPhone"
              type="tel"
              required
              placeholder="0300-1234567"
              className="form-input text-xs"
            />
          </div>
          <div>
            <label className="form-label text-xs font-semibold">Captain CNIC / B-Form</label>
            <input
              name="captainCnic"
              type="text"
              required
              placeholder="35202-1234567-1"
              className="form-input text-xs"
            />
          </div>
        </div>

        <div>
          <label className="form-label text-xs font-semibold">
            Captain Student ID Photo / Document <span className="text-red-600">*</span>
          </label>
          <input
            name="captainStudentDocument"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            required
            className="form-input text-xs"
          />
        </div>
      </div>

      <div>
        <label className="form-label font-semibold">Total Team Size (including Captain)</label>
        <select
          value={teamSize}
          onChange={(e) => setTeamSize(Number(e.target.value))}
          className="form-input"
        >
          {sizeOptions.map((size) => (
            <option key={size} value={size}>
              {size} Members
            </option>
          ))}
        </select>
      </div>

      {/* Member Sections */}
      {Array.from({ length: teammateCount }, (_, index) => (
        <div
          key={index}
          className="p-4 rounded-lg bg-gray-50/70 border border-gray-200 space-y-3"
        >
          <h4 className="font-bold text-xs uppercase tracking-wide text-gray-700">
            Team Member {index + 1}
          </h4>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label text-xs font-semibold">Member {index + 1} Full Name</label>
              <input
                name="memberNames"
                type="text"
                required
                placeholder={`Member ${index + 1} Name`}
                className="form-input text-xs"
              />
            </div>
            <div>
              <label className="form-label text-xs font-semibold">Member {index + 1} Email</label>
              <input
                name="memberEmails"
                type="email"
                required
                placeholder={`member${index + 1}@example.com`}
                className="form-input text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label text-xs font-semibold">Member {index + 1} Phone</label>
              <input
                name="memberPhones"
                type="tel"
                required
                placeholder="0300-1234567"
                className="form-input text-xs"
              />
            </div>
            <div>
              <label className="form-label text-xs font-semibold">Member {index + 1} CNIC / B-Form</label>
              <input
                name="memberCnics"
                type="text"
                required
                placeholder="35202-1234567-1"
                className="form-input text-xs"
              />
            </div>
          </div>

          <div>
            <label className="form-label text-xs font-semibold">
              Member {index + 1} Student ID Photo / Document <span className="text-red-600">*</span>
            </label>
            <input
              name={`memberStudentDocument_${index}`}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              required
              className="form-input text-xs"
            />
          </div>
        </div>
      ))}

      {/* Accommodation */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-gray-200">
        <div>
          <label className="form-label font-semibold">Accommodation Selection</label>
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
        {pending ? 'Processing Team Registration...' : 'Register Team'}
      </Button>
    </form>
  );
}
