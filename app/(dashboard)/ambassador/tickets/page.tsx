import React from 'react';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getTicketDisplayStatus } from '@/lib/ticket-utils';
import { redirect } from 'next/navigation';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default async function AmbassadorTicketsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'AMBASSADOR') {
    redirect('/login');
  }

  const tickets = user.participant
    ? await prisma.ticket.findMany({
        where: {
          registration: {
            OR: [
              { participantId: user.participant.id },
              { team: { captainId: user.participant.id } },
              { team: { members: { some: { participantId: user.participant.id } } } },
            ],
          },
        },
        include: {
          registration: { include: { event: true, team: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    : [];

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
          My Tickets
        </h1>
        <div
          className="mt-2 h-[4px] w-[56px] rounded-[2px]"
          style={{ backgroundColor: 'var(--color-primary)' }}
        />
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Tickets for events you are personally participating in.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tickets.map((t) => {
          const displayStatus = getTicketDisplayStatus(t);

          return (
            <div
              key={t.id}
              className="flex items-center gap-6 p-6 rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] border-t-4"
              style={{ borderTopColor: 'var(--color-secondary)' }}
            >
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(t.qrData)}`}
                alt="Ticket QR code"
                className="h-24 w-24 shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-divider)]"
              />
              <div className="flex flex-col gap-1">
                <p
                  style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
                  className="font-bold uppercase tracking-tight text-[var(--color-text)]"
                >
                  {t.registration.event.name}
                </p>
                {t.registration.team && (
                  <p className="text-xs font-semibold text-[var(--color-text-muted)]">
                    Team: {t.registration.team.name}
                  </p>
                )}
                <p className="font-mono text-sm font-bold text-[var(--color-primary)] mt-1">
                  {t.ticketCode}
                </p>
                <div className="mt-2">
                  <StatusBadge status={displayStatus} />
                </div>
              </div>
            </div>
          );
        })}

        {tickets.length === 0 && (
          <div className="col-span-full p-12 text-center rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] text-[var(--color-text-muted)]">
            No tickets yet. Tickets are issued automatically once your payment is verified.
          </div>
        )}
      </div>
    </div>
  );
}
