import React from 'react';
import { prisma } from '@/lib/prisma';
import { EventsExplorer, SerializedEvent } from '@/components/events/EventsExplorer';

export const dynamic = 'force-dynamic';

export default async function PublicEventsPage() {
  const events = await prisma.event.findMany({
    where: { status: { in: ['OPEN', 'CLOSED', 'COMPLETED'] } },
    orderBy: { eventDate: 'asc' },
  });

  const serializedEvents: SerializedEvent[] = events.map((e) => ({
    id: e.id,
    name: e.name,
    category: e.category,
    description: e.description ?? null,
    venue: e.venue ?? null,
    eventDate: e.eventDate.toISOString(),
    registrationFee: e.registrationFee.toString(),
    prizeMoney: e.prizeMoney ? e.prizeMoney.toString() : null,
    status: e.status,
    registrationType: e.registrationType,
  }));

  return <EventsExplorer events={serializedEvents} />;
}
