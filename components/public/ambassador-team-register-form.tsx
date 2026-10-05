'use client';

import { useState } from 'react';
import { registerTeamAction } from '@/app/(dashboard)/ambassador/actions';
import { Button } from '@/components/ui/Button';

export function AmbassadorTeamRegisterForm({
  eventId,
  minTeamSize,
  maxTeamSize,
}: {
  eventId: string;
  minTeamSize: number | null;
  maxTeamSize: number | null;
}) {
  const lower = minTeamSize ?? 1;
  const upper = maxTeamSize ?? Math.max(lower, 10);

  const sizeOptions = Array.from(
    { length: upper - lower + 1 },
    (_, i) => lower + i
  );

  const [teamSize, setTeamSize] = useState(lower);

  const teammateCount = Math.max(0, teamSize - 1);

  return (
    <form
      action={registerTeamAction}
      className="mt-4 flex flex-col gap-4 rounded-[var(--radius-md)] border border-[var(--color-divider)] p-5 bg-[var(--color-surface)]"
    >
      <input
        type="hidden"
        name="eventId"
        value={eventId}
      />

      <div>
        <label className="form-label">
          Team Name
        </label>

        <input
          name="teamName"
          type="text"
          required
          className="form-input"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="form-label">
            Captain Email
          </label>

          <input
            name="captainEmail"
            type="email"
            required
            placeholder="captain@example.com"
            className="form-input"
          />
        </div>

        <div>
          <label className="form-label">
            Captain CNIC
          </label>

          <input
            name="captainCnic"
            type="text"
            required
            placeholder="35202-1234567-1"
            className="form-input"
          />
        </div>
      </div>

      <div>
        <label className="form-label">
          Team Size
        </label>

        <select
          value={teamSize}
          onChange={(e) => setTeamSize(Number(e.target.value))}
          className="form-input"
        >
          {sizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      {Array.from({ length: teammateCount }, (_, index) => (
        <div key={index} className="grid grid-cols-1 gap-4 border-t border-[var(--color-divider)] pt-4 sm:grid-cols-2">
          <div>
            <label className="form-label">
              Member {index + 1} Email
            </label>

            <input
              name="memberEmails"
              type="email"
              required
              placeholder={`member${index + 1}@example.com`}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">
              Member {index + 1} CNIC
            </label>

            <input
              name="memberCnics"
              type="text"
              required
              placeholder="35202-1234567-1"
              className="form-input"
            />
          </div>
        </div>
      ))}

      <Button type="submit" variant="primary" className="w-full mt-2">
        Register Team
      </Button>
    </form>
  );
}
