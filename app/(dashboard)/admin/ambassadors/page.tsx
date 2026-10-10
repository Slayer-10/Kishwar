import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { createAmbassadorAction } from '../actions';
import { DeleteAmbassadorButton } from '@/components/dashboard/delete-ambassador-button';
import { Button } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

export default async function AdminAmbassadorsPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const [ambassadors, universities] = await Promise.all([
    prisma.ambassador.findMany({
      orderBy: { assignedAt: 'desc' },
      include: { user: true, university: true },
    }),
    prisma.university.findMany({
      orderBy: { name: 'asc' },
    }),
  ]);

  const assignedUniIds = new Set(ambassadors.map((a) => a.universityId));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
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
            Ambassadors
          </h1>
          <div
            className="mt-2 h-[4px] w-[56px] rounded-[2px]"
            style={{ backgroundColor: 'var(--color-primary)' }}
          />
        </div>

        <Button href="/admin/ambassador-requests" variant="primary">
          Review Requests
        </Button>
      </div>

      {searchParams.error && <div className="form-error">{searchParams.error}</div>}

      {/* Create Ambassador Form */}
      <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] flex flex-col gap-4">
        <h2
          style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
          className="font-bold text-[var(--color-text)] uppercase tracking-wide"
        >
          Create Campus Ambassador
        </h2>
        <form action={createAmbassadorAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Email Address</label>
            <input
              name="email"
              type="email"
              required
              placeholder="ambassador@example.com"
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Password</label>
            <input
              name="password"
              type="password"
              required
              placeholder="At least 8 characters"
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">University</label>
            <select name="universityId" required className="form-input">
              <option value="">Select University</option>
              {universities.map((uni) => {
                const isTaken = assignedUniIds.has(uni.id);
                return (
                  <option key={uni.id} value={uni.id} disabled={isTaken}>
                    {uni.name}
                    {uni.city ? ` (${uni.city})` : ''}
                    {isTaken ? ' (already has an ambassador)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="form-label">Ambassador Code</label>
            <input
              name="ambassadorCode"
              type="text"
              required
              placeholder="e.g. AMB-FAST-001"
              className="form-input"
            />
          </div>

          <div className="md:col-span-2 pt-2">
            <Button type="submit" variant="primary">
              Create Ambassador
            </Button>
          </div>
        </form>
      </div>

      <div
        className="p-5 rounded-[var(--radius-md)] border-l-4 text-sm"
        style={{
          backgroundColor: 'rgba(106, 172, 220, 0.08)',
          borderColor: 'var(--color-accent)',
          color: 'var(--color-text)',
        }}
      >
        You can also approve ambassadors directly from participant requests on the{' '}
        <Link href="/admin/ambassador-requests" className="font-bold text-[var(--color-primary)] underline">
          Ambassador Requests
        </Link>{' '}
        page.
      </div>

      <div className="w-full overflow-x-auto rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr
              style={{ backgroundColor: 'var(--color-secondary)', color: '#FFFFFF' }}
              className="font-heading text-xs uppercase tracking-wider h-[48px]"
            >
              <th className="px-5 py-3 font-semibold">Email</th>
              <th className="px-5 py-3 font-semibold">University</th>
              <th className="px-5 py-3 font-semibold">Code</th>
              <th className="px-5 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-divider)]">
            {ambassadors.map((a) => (
              <tr
                key={a.id}
                className="h-[56px] transition-colors hover:bg-[rgba(106,172,220,0.08)]"
              >
                <td className="px-5 py-3 font-semibold text-[var(--color-text)]">{a.user.email}</td>
                <td className="px-5 py-3 text-[var(--color-text-muted)]">{a.university.name}</td>
                <td className="px-5 py-3 font-mono font-bold text-[var(--color-secondary)]">
                  {a.ambassadorCode}
                </td>
                <td className="px-5 py-3">
                  <DeleteAmbassadorButton ambassadorId={a.id} />
                </td>
              </tr>
            ))}
            {ambassadors.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-[var(--color-text-muted)]">
                  No ambassadors yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
