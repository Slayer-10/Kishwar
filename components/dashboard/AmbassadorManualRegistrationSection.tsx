'use client';

import { useState } from 'react';
import { AmbassadorRegisterForm } from '@/components/public/ambassador-register-form';
import { AmbassadorTeamRegisterForm } from '@/components/public/ambassador-team-register-form';
import { AmbassadorSelfRegisterForm } from '@/components/public/ambassador-self-register-form';

type EventOption = {
  id: string;
  name: string;
  registrationType: string;
  minTeamSize: number | null;
  maxTeamSize: number | null;
};

type Props = {
  events: EventOption[];
};

export function AmbassadorManualRegistrationSection({ events }: Props) {
  const [activeTab, setActiveTab] = useState<'individual' | 'team' | 'self'>('individual');

  return (
    <section className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] border-t-4 border-t-[var(--color-primary)] flex flex-col gap-6">
      <div>
        <h2
          style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
          className="font-bold uppercase tracking-tight text-[var(--color-text)]"
        >
          Manual Participant & Team Registration
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Register individual participants, teams, or yourself directly for open events. All Ambassador registrations reserve seats automatically upon submission.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--color-divider)] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('individual')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'individual'
              ? 'bg-[var(--color-primary)] text-white shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Register Individual Participant
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('team')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'team'
              ? 'bg-[var(--color-primary)] text-white shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Register Team
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('self')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'self'
              ? 'bg-[var(--color-primary)] text-white shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Register Myself
        </button>
      </div>

      {/* Active Form */}
      <div>
        {activeTab === 'individual' && <AmbassadorRegisterForm events={events} />}
        {activeTab === 'team' && <AmbassadorTeamRegisterForm events={events} />}
        {activeTab === 'self' && <AmbassadorSelfRegisterForm events={events} />}
      </div>
    </section>
  );
}
