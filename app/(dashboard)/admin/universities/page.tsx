import React from 'react';
import { prisma } from '@/lib/prisma';
import { createUniversityAction } from '@/app/(dashboard)/admin/actions';
import { DeleteUniversityButton } from '@/components/dashboard/delete-university-button';
import { Button } from '@/components/ui/Button';

export const dynamic = "force-dynamic";

export const dynamic = 'force-dynamic';

export default async function AdminUniversitiesPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const universities = await prisma.university.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { ambassadors: true, teams: true } } },
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
          Universities
        </h1>
        <div
          className="mt-2 h-[4px] w-[56px] rounded-[2px]"
          style={{ backgroundColor: 'var(--color-primary)' }}
        />
      </div>

      {searchParams.error && <div className="form-error">{searchParams.error}</div>}

      {/* Add University Form */}
      <form
        action={createUniversityAction}
        className="flex flex-col sm:flex-row max-w-2xl gap-3 p-5 rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]"
      >
        <div className="flex-1">
          <input
            name="name"
            type="text"
            placeholder="University name"
            required
            className="form-input"
          />
        </div>
        <div className="w-full sm:w-48">
          <input name="city" type="text" placeholder="City" className="form-input" />
        </div>
        <Button type="submit" variant="primary">
          Add
        </Button>
      </form>

      {/* Universities Table */}
      <div className="w-full overflow-x-auto rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr
              style={{ backgroundColor: 'var(--color-secondary)', color: '#FFFFFF' }}
              className="font-heading text-xs uppercase tracking-wider h-[48px]"
            >
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">City</th>
              <th className="px-5 py-3 font-semibold">Ambassadors</th>
              <th className="px-5 py-3 font-semibold">Teams</th>
              <th className="px-5 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-divider)]">
            {universities.map((u) => (
              <tr
                key={u.id}
                className="h-[56px] transition-colors hover:bg-[rgba(106,172,220,0.08)]"
              >
                <td className="px-5 py-3 font-semibold text-[var(--color-text)]">{u.name}</td>
                <td className="px-5 py-3 text-[var(--color-text-muted)]">{u.city ?? '—'}</td>
                <td className="px-5 py-3 font-semibold text-[var(--color-text)]">
                  {u._count.ambassadors}
                </td>
                <td className="px-5 py-3 font-semibold text-[var(--color-text)]">
                  {u._count.teams}
                </td>
                <td className="px-5 py-3">
                  <DeleteUniversityButton universityId={u.id} />
                </td>
              </tr>
            ))}
            {universities.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-[var(--color-text-muted)]">
                  No universities yet. Add the first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
