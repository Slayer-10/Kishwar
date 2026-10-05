import React from 'react';
import { prisma } from '@/lib/prisma';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default async function AdminRegistrationsPage() {
  const registrations = await prisma.registration.findMany({
    include: {
      event: true,
      participant: true,
      team: { include: { captain: true, university: true } },
      invoice: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col">
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--fs-title1)',
            lineHeight: 'var(--lh-title1)',
            color: 'var(--color-text)',
          }}
          className="font-bold uppercase tracking-tight"
        >
          Registrations
        </h1>
        <div
          className="mt-2 h-[4px] w-[56px] rounded-[2px]"
          style={{ backgroundColor: 'var(--color-primary)' }}
        />
      </div>

      <div className="w-full overflow-x-auto rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr
              style={{ backgroundColor: 'var(--color-secondary)', color: '#FFFFFF' }}
              className="font-heading text-xs uppercase tracking-wider h-[48px]"
            >
              <th className="px-5 py-3 font-semibold">Event</th>
              <th className="px-5 py-3 font-semibold">Registrant</th>
              <th className="px-5 py-3 font-semibold">Type</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Invoice</th>
              <th className="px-5 py-3 font-semibold">Registered</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-divider)]">
            {registrations.map((r) => (
              <tr
                key={r.id}
                className="h-[56px] transition-colors hover:bg-[rgba(106,172,220,0.08)]"
              >
                <td className="px-5 py-3 font-semibold text-[var(--color-text)]">{r.event.name}</td>
                <td className="px-5 py-3 text-[var(--color-text)]">
                  {r.participant?.fullName ?? r.team?.name ?? 'Unknown'}
                  {r.team && (
                    <span className="ml-1 text-xs text-[var(--color-text-muted)]">
                      ({r.team.captain.fullName}
                      {r.team.university ? `, ${r.team.university.name}` : ''})
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 font-medium text-[var(--color-text-muted)]">
                  {r.team ? 'Team' : 'Individual'}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-5 py-3 text-[var(--color-text)]">
                  {r.invoice ? (
                    <span className="flex items-center gap-2">
                      <StatusBadge status={r.invoice.status} />
                      <span className="text-xs font-semibold">PKR {r.invoice.amount.toString()}</span>
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-5 py-3 text-[var(--color-text-muted)]">
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}

            {registrations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-[var(--color-text-muted)]">
                  No registrations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
