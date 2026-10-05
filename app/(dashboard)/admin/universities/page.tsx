import { prisma } from '@/lib/prisma';
import { createUniversityAction } from '@/app/(dashboard)/admin/actions';
import { DeleteUniversityButton } from '@/components/dashboard/delete-university-button';

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
    <div>
      <h1 className="mb-6 text-2xl font-bold">Universities</h1>

      {searchParams.error && (
        <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">{searchParams.error}</div>
      )}

      <form action={createUniversityAction} className="mb-8 flex max-w-lg gap-3">
        <input name="name" type="text" placeholder="University name" required className="flex-1 rounded border p-2" />
        <input name="city" type="text" placeholder="City" className="w-40 rounded border p-2" />
        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
          Add
        </button>
      </form>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Name</th>
            <th className="p-2">City</th>
            <th className="p-2">Ambassadors</th>
            <th className="p-2">Teams</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {universities.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="p-2">{u.name}</td>
              <td className="p-2">{u.city ?? '—'}</td>
              <td className="p-2">{u._count.ambassadors}</td>
              <td className="p-2">{u._count.teams}</td>
              <td className="p-2">
                <DeleteUniversityButton universityId={u.id} />
              </td>
            </tr>
          ))}
          {universities.length === 0 && (
            <tr>
              <td colSpan={5} className="p-4 text-center text-slate-500">
                No universities yet. Add the first one above.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
