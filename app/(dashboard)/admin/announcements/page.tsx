import React from 'react';
import { prisma } from '@/lib/prisma';
import { createAnnouncementAction } from '@/app/(dashboard)/admin/actions';
import { AnnouncementRowActions } from '@/components/dashboard/announcement-row-actions';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });

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
          Announcements
        </h1>
        <div
          className="mt-2 h-[4px] w-[56px] rounded-[2px]"
          style={{ backgroundColor: 'var(--color-primary)' }}
        />
      </div>

      {searchParams.error && <div className="form-error">{searchParams.error}</div>}

      <form
        action={createAnnouncementAction}
        className="flex max-w-2xl flex-col gap-4 p-6 rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]"
      >
        <div>
          <label className="form-label">Announcement Title</label>
          <input
            name="title"
            type="text"
            placeholder="Title"
            required
            className="form-input"
          />
        </div>

        <div>
          <label className="form-label">Body Content</label>
          <textarea
            name="body"
            placeholder="Announcement body"
            required
            rows={3}
            className="form-input !h-auto py-3"
          />
        </div>

        <Button type="submit" variant="primary" className="self-start">
          Post Announcement
        </Button>
      </form>

      <div className="flex flex-col gap-4">
        {announcements.map((a) => (
          <div
            key={a.id}
            className="p-6 rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] flex flex-col gap-3"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-divider)] pb-3">
              <h2
                style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
                className="font-bold text-[var(--color-text)]"
              >
                {a.title}
              </h2>
              <StatusBadge status={a.isPublished ? 'CONFIRMED' : 'DRAFT'} />
            </div>

            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{a.body}</p>

            <div className="pt-2">
              <AnnouncementRowActions announcementId={a.id} isPublished={a.isPublished} />
            </div>
          </div>
        ))}

        {announcements.length === 0 && (
          <p className="text-center py-12 text-[var(--color-text-muted)]">No announcements yet.</p>
        )}
      </div>
    </div>
  );
}
