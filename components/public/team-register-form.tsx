'use client';

import { useState } from 'react';
import { spaceGrotesk } from '@/lib/fonts';
import { registerTeamAction } from '@/app/(dashboard)/participant/actions';

export function TeamRegisterForm({
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
  const sizeOptions = Array.from({ length: upper - lower + 1 }, (_, i) => lower + i);
  const [teamSize, setTeamSize] = useState(lower);
  const teammateCount = teamSize - 1;

  return (
    <form
      action={registerTeamAction.bind(null, eventId)}
      className="mt-8 flex flex-col gap-3 rounded-sm border border-[#2A2E3A] p-5"
    >
      <h2 className={`${spaceGrotesk.className} text-base font-bold text-[#F2F0EA]`}>Register as a Team</h2>

      <div>
        <label className="mb-1 block text-xs font-medium text-[#C9C6BD]">Team Name</label>
        <input
          name="teamName"
          type="text"
          required
          className="w-full rounded-sm border border-[#2A2E3A] bg-transparent p-2 text-sm text-[#F2F0EA]"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-[#C9C6BD]">Team Size (including you)</label>
        <select
          value={teamSize}
          onChange={(e) => setTeamSize(Number(e.target.value))}
          className="w-full rounded-sm border border-[#2A2E3A] bg-[#12141C] p-2 text-sm text-[#F2F0EA]"
        >
          {sizeOptions.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      {Array.from({ length: teammateCount }, (_, i) => (
        <div key={i}>
          <label className="mb-1 block text-xs font-medium text-[#C9C6BD]">Teammate {i + 1} Email</label>
          <input
            name="memberEmails"
            type="email"
            required
            className="w-full rounded-sm border border-[#2A2E3A] bg-transparent p-2 text-sm text-[#F2F0EA]"
          />
        </div>
      ))}

      <button
        type="submit"
        className="mt-1 self-start rounded-sm bg-[#E8A33D] px-4 py-2 text-sm font-medium text-[#12141C]"
      >
        Register Team
      </button>
    </form>
  );
}
