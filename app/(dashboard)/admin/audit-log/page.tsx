import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminAuditLogPage() {
  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { timestamp: 'desc' },
    take: 100,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Audit Log</h1>
      <p className="mb-4 text-sm text-slate-500">Showing the most recent 100 actions.</p>

      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Admin</th>
              <th className="p-3">Action</th>
              <th className="p-3">Target</th>
              <th className="p-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t">
                <td className="p-3">{log.timestamp.toLocaleString()}</td>
                <td className="p-3">{log.user.email}</td>
                <td className="p-3">
                  <span className={`rounded px-2 py-0.5 text-xs ${
                    log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                    log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                    log.action === 'VERIFY' ? 'bg-green-100 text-green-700' :
                    log.action === 'REJECT' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {log.action}
                  </span>
                </td>
                <td className="p-3">{log.targetTable} ({log.targetId.slice(0, 8)}...)</td>
                <td className="p-3 font-mono text-xs">{JSON.stringify(log.details)}</td>
              </tr>
            ))}

            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  No actions logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
