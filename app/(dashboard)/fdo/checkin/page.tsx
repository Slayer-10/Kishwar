import React from 'react';
import { prisma } from '@/lib/prisma';
import { checkInTicketAction } from '@/app/(dashboard)/fdo/actions';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';

export const dynamic = "force-dynamic";

export const dynamic = 'force-dynamic';

export default async function FdoCheckinPage({
  searchParams,
}: {
  searchParams: { code?: string; error?: string; success?: string };
}) {
  const ticket = searchParams.code
    ? await prisma.ticket.findUnique({
        where: { ticketCode: searchParams.code.toUpperCase() },
        include: {
          registration: {
            include: { event: true, participant: true, team: { include: { captain: true } } },
          },
        },
      })
    : null;

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
          Ticket Check-In
        </h1>
        <div
          className="mt-2 h-[4px] w-[56px] rounded-[2px]"
          style={{ backgroundColor: 'var(--color-primary)' }}
        />
      </div>

      <form
        action={checkInTicketAction}
        className="flex flex-wrap items-end gap-4 p-6 rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] max-w-xl"
      >
        <div className="flex-1 min-w-[240px]">
          <label className="form-label">Ticket Code</label>
          <input
            name="ticketCode"
            type="text"
            required
            placeholder="TCK-XXXXXXXX"
            defaultValue={searchParams.code ?? ''}
            className="form-input font-mono uppercase"
          />
        </div>
        <Button type="submit" variant="primary">
          Look Up / Check In
        </Button>
      </form>

      {searchParams.error && <div className="form-error">{searchParams.error}</div>}

      {searchParams.success && (
        <div
          className="p-4 rounded-[var(--radius-sm)] border-l-4 text-sm font-semibold"
          style={{
            borderColor: 'var(--color-success)',
            backgroundColor: 'rgba(45, 125, 70, 0.08)',
            color: 'var(--color-success)',
          }}
        >
          {searchParams.success}
        </div>
      )}

      {ticket && (
        <div className="p-6 rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] flex flex-col gap-3 max-w-xl border-t-4 border-t-[var(--color-primary)]">
          <h2
            style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
            className="font-bold uppercase text-[var(--color-text)]"
          >
            {ticket.registration.event.name}
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] font-medium">
            {ticket.registration.participant?.fullName ??
              `${ticket.registration.team?.name} (Captain: ${ticket.registration.team?.captain.fullName})`}
          </p>
          <p className="font-mono text-sm font-bold text-[var(--color-primary)]">
            {ticket.ticketCode}
          </p>
          <div className="mt-2">
            <StatusBadge status={ticket.status} />
          </div>
        </div>
      )}
    </div>
  );
}
