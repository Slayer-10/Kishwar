import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';

export default async function AmbassadorMyRegistrationsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'AMBASSADOR') {
    redirect('/login');
  }

  const participant = user.participant;

  const registrations = participant
    ? await prisma.registration.findMany({
        where: {
          OR: [
            { participantId: participant.id },
            { team: { captainId: participant.id } },
            { team: { members: { some: { participantId: participant.id } } } },
          ],
        },
        include: {
          event: true,
          team: {
            include: {
              members: {
                include: {
                  participant: true,
                },
              },
            },
          },
          invoice: true,
          ticket: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    : [];

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
            My Personal Registrations
          </h1>
          <div
            className="mt-2 h-[4px] w-[56px] rounded-[2px]"
            style={{ backgroundColor: 'var(--color-primary)' }}
          />
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Competitions where you are personally participating.
          </p>
        </div>

        <Button href="/events" variant="primary">
          Browse Events
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {registrations.map((reg) => (
          <div
            key={reg.id}
            className="p-6 rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] flex flex-col justify-between gap-4 border-t-4"
            style={{ borderTopColor: 'var(--color-secondary)' }}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase font-semibold text-[var(--color-primary)]">
                  {reg.event.category ?? 'Event'}
                </span>
                <StatusBadge status={reg.status} />
              </div>

              <h2
                style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-title2)' }}
                className="font-bold uppercase text-[var(--color-text)]"
              >
                {reg.event.name}
              </h2>
              {reg.team && (
                <p className="text-xs font-semibold text-[var(--color-text-muted)]">
                  Team: {reg.team.name}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--color-divider)] text-sm">
              <span className="text-xs font-bold text-[var(--color-primary)]">
                Fee: PKR {reg.event.registrationFee.toString()}
              </span>

              <div className="flex items-center gap-2">
                {reg.invoice && reg.invoice.status !== 'PAID' && (
                  <Button href="/ambassador/payments" variant="secondary" size="sm">
                    Pay Invoice ({reg.invoice.invoiceNumber})
                  </Button>
                )}

                {reg.ticket && (
                  <Button href="/ambassador/tickets" variant="primary" size="sm">
                    View Ticket
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}

        {registrations.length === 0 && (
          <div className="col-span-full p-12 text-center rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] text-[var(--color-text-muted)]">
            <p>You have not registered for any personal event competitions yet.</p>
            <div className="mt-4">
              <Button href="/events" variant="primary">
                Browse Open Events
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
