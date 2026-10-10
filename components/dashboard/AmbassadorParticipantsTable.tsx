'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Users, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export type SerializedMember = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  cnic: string | null;
  isCaptain?: boolean;
};

export type SerializedRegistration = {
  id: string;
  eventName: string;
  isTeam: boolean;
  displayName: string;
  status: string;
  createdAt: string;
  members: SerializedMember[];
};

interface AmbassadorParticipantsTableProps {
  registrations: SerializedRegistration[];
}

export function AmbassadorParticipantsTable({ registrations }: AmbassadorParticipantsTableProps) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (registrations.length === 0) {
    return (
      <div className="p-8 text-center rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] text-[var(--color-text-muted)] font-medium">
        No registrations from your campus yet.
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="w-full overflow-x-auto rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr
              style={{ backgroundColor: 'var(--color-secondary)', color: '#FFFFFF' }}
              className="font-heading text-xs uppercase tracking-wider h-[48px]"
            >
              <th className="px-5 py-3 font-semibold">Event</th>
              <th className="px-5 py-3 font-semibold">Team / Participant</th>
              <th className="px-5 py-3 font-semibold">Type</th>
              <th className="px-5 py-3 font-semibold text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-divider)]">
            {registrations.map((reg) => {
              const isExpanded = Boolean(expandedIds[reg.id]);

              return (
                <React.Fragment key={reg.id}>
                  <tr className="h-[56px] transition-colors hover:bg-[rgba(106,172,220,0.08)]">
                    <td className="px-5 py-3 font-semibold text-[var(--color-text)]">
                      {reg.eventName}
                    </td>
                    <td className="px-5 py-3 font-semibold text-[var(--color-text)]">
                      {reg.displayName}
                    </td>
                    <td className="px-5 py-3">
                      {reg.isTeam ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800">
                          <Users size={12} /> Team
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-800">
                          <User size={12} /> Solo
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRow(reg.id)}
                        className="inline-flex items-center gap-1 text-xs"
                      >
                        {isExpanded ? (
                          <>
                            Hide <ChevronUp size={14} />
                          </>
                        ) : (
                          <>
                            View more <ChevronDown size={14} />
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan={4} className="bg-[var(--color-background)] p-5 border-b border-[var(--color-divider)]">
                        <div className="flex flex-col gap-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                            {reg.isTeam ? `Team Members (${reg.displayName})` : 'Participant Details'}
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {reg.members.map((member) => (
                              <div
                                key={member.id}
                                className="p-3.5 rounded-[var(--radius-sm)] bg-[var(--color-surface)] border border-[var(--color-divider)] flex flex-col gap-1 shadow-sm"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-[var(--color-text)]">
                                    {member.fullName}
                                  </span>
                                  {member.isCaptain && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-[var(--color-primary)] text-white">
                                      Captain
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-[var(--color-text-muted)]">
                                  Email: {member.email}
                                </span>
                                <span className="text-xs text-[var(--color-text-muted)]">
                                  CNIC: {member.cnic || '—'}
                                </span>
                                <span className="text-xs text-[var(--color-text-muted)]">
                                  Phone: {member.phone || '—'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
