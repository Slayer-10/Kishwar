import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { DeleteAmbassadorButton } from '@/components/dashboard/delete-ambassador-button';

export default async function AdminAmbassadorsPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const ambassadors = await prisma.ambassador.findMany({
    orderBy: { assignedAt: 'desc' },
    include: { user: true, university: true },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ambassadors</h1>
        <Link
          href="/admin/ambassador-requests"
          className="rounded bg-slate-900 px-4 py-2 text-sm text-white"
        >
          Review Ambassador Requests
        </Link>
      </div>

      {searchParams.error && (
        <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">{searchParams.error}</div>
      )}

      <div className="mb-8 rounded border p-4 bg-slate-50 text-sm text-slate-600">
        New Ambassadors are created by reviewing and approving participant requests on the{' '}
        <Link href="/admin/ambassador-requests" className="font-semibold text-slate-900 underline">
          Ambassador Requests
        </Link>{' '}
        page.
      </div>

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
                No ambassadors yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
