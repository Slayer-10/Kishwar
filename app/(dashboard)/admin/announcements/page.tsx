import { prisma } from '@/lib/prisma';
import { createAnnouncementAction } from '@/app/(dashboard)/admin/actions';
import { AnnouncementRowActions } from '@/components/dashboard/announcement-row-actions';

export const dynamic = 'force-dynamic';

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Announcements</h1>

      {searchParams.error && (
        <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">{searchParams.error}</div>
      )}

      <form action={createAnnouncementAction} className="mb-8 flex max-w-2xl flex-col gap-3">
        <input name="title" type="text" placeholder="Title" required className="rounded border p-2" />
        <textarea name="body" placeholder="Announcement body" required rows={3} className="rounded border p-2" />
        <button type="submit" className="w-fit rounded bg-slate-900 px-4 py-2 text-white">
          Post Announcement
        </button>
      </form>

      <div className="flex flex-col gap-3">
        {announcements.map((a) => (
          <div key={a.id} className="rounded border p-3">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-semibold">{a.title}</h2>
              <span className={`rounded px-2 py-0.5 text-xs ${a.isPublished ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                {a.isPublished ? 'Published' : 'Draft'}
              </span>
            </div>
            <p className="mb-2 text-sm text-slate-700">{a.body}</p>
            <AnnouncementRowActions announcementId={a.id} isPublished={a.isPublished} />
          </div>
        ))}
        {announcements.length === 0 && (
          <p className="text-center text-slate-500">No announcements yet.</p>
        )}
      </div>
    </div>
  );
}
