'use client';

import { useState } from 'react';
import { registerTeamAction } from '@/app/(dashboard)/ambassador/actions';

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
      className="mt-5 flex flex-col gap-4 rounded-sm border border-[#2A2E3A] p-5"
    >
      <input
        type="hidden"
        name="eventId"
        value={eventId}
      />

      <div>
        <label className="mb-1 block text-xs font-medium text-[#C9C6BD]">
          Team Name
        </label>

        <input
          name="teamName"
          type="text"
          required
          className="w-full rounded-sm border border-[#2A2E3A] bg-transparent p-2 text-sm text-[#F2F0EA]"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#C9C6BD]">
            Captain Email
          </label>

          <input
            name="captainEmail"
            type="email"
            required
            placeholder="captain@example.com"
            className="w-full rounded-sm border border-[#2A2E3A] bg-transparent p-2 text-sm text-[#F2F0EA]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[#C9C6BD]">
            Captain CNIC
          </label>

          <input
            name="captainCnic"
            type="text"
            required
            placeholder="35202-1234567-1"
            className="w-full rounded-sm border border-[#2A2E3A] bg-transparent p-2 text-sm text-[#F2F0EA]"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-[#C9C6BD]">
          Team Size
        </label>

        <select
          value={teamSize}
          onChange={(e) => setTeamSize(Number(e.target.value))}
          className="w-full rounded-sm border border-[#2A2E3A] bg-[#12141C] p-2 text-sm text-[#F2F0EA]"
        >
          {sizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      {Array.from({ length: teammateCount }, (_, index) => (
        <div key={index} className="grid grid-cols-1 gap-3 border-t border-[#2A2E3A] pt-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#C9C6BD]">
              Member {index + 1} Email
            </label>

            <input
              name="memberEmails"
              type="email"
              required
              placeholder={`member${index + 1}@example.com`}
              className="w-full rounded-sm border border-[#2A2E3A] bg-transparent p-2 text-sm text-[#F2F0EA]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#C9C6BD]">
              Member {index + 1} CNIC
            </label>

            <input
              name="memberCnics"
              type="text"
              required
              placeholder="35202-1234567-1"
              className="w-full rounded-sm border border-[#2A2E3A] bg-transparent p-2 text-sm text-[#F2F0EA]"
            />
          </div>
        </div>
      ))}

      <button
        type="submit"
        className="mt-2 self-start rounded-sm bg-[#E8A33D] px-4 py-2 text-sm font-medium text-[#12141C]"
      >
        Register Team
      </button>
    </form>
  );
}
