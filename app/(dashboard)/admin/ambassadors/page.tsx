import { prisma } from '@/lib/prisma';
import { createAmbassadorAction } from '@/app/(dashboard)/admin/actions';
import { DeleteAmbassadorButton } from '@/components/dashboard/delete-ambassador-button';

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
    prisma.university.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Ambassadors</h1>

      {searchParams.error && (
        <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">{searchParams.error}</div>
      )}

      <form action={createAmbassadorAction} className="mb-8 flex max-w-2xl flex-col gap-3">
        <input name="email" type="email" placeholder="Email address" required className="rounded border p-2" />
        <input name="password" type="password" placeholder="Password (min 8 characters)" required className="rounded border p-2" />
        <select name="universityId" required className="rounded border p-2">
          <option value="">Select University</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} {u.city ? `(${u.city})` : ''}
            </option>
          ))}
        </select>
        <input name="ambassadorCode" type="text" placeholder="Ambassador Code" required className="rounded border p-2" />
        <button type="submit" className="w-fit rounded bg-slate-900 px-4 py-2 text-white">
          Create Ambassador Account
        </button>
      </form>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Email</th>
            <th className="p-2">University</th>
            <th className="p-2">Code</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {ambassadors.map((a) => (
            <tr key={a.id} className="border-b">
              <td className="p-2">{a.user.email}</td>
              <td className="p-2">{a.university.name}</td>
              <td className="p-2">{a.ambassadorCode}</td>
              <td className="p-2">
                <DeleteAmbassadorButton ambassadorId={a.id} />
              </td>
            </tr>
          ))}
          {ambassadors.length === 0 && (
            <tr>
              <td colSpan={4} className="p-4 text-center text-slate-500">
                No ambassadors yet. Add the first one above.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
