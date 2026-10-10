import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type RegistrationReviewAudience = "AMBASSADOR" | "ADMIN";

export async function getReviewEventSummaries(
  audience: RegistrationReviewAudience,
  ambassadorId?: string
) {
  const where =
    audience === "AMBASSADOR"
      ? {
          source: "PUBLIC" as const,
          reviewStatus: "PENDING_AMBASSADOR" as const,
          ambassadorId: ambassadorId!,
        }
      : {
          source: "PUBLIC" as const,
          reviewStatus: "PENDING_ADMIN" as const,
          ambassadorId: null,
        };

  const registrations = await prisma.registration.findMany({
    where,
    select: {
      eventId: true,
      event: {
        select: {
          id: true,
          name: true,
          eventDate: true,
          seatCapacity: true,
        },
      },
      participant: {
        select: {
          universityId: true,
          university: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  const grouped = new Map<
    string,
    {
      eventId: string;
      eventName: string;
      eventDate: Date;
      seatCapacity: number | null;
      pendingCount: number;
      universities: Map<string, number>;
    }
  >();

  for (const registration of registrations) {
    let item = grouped.get(registration.eventId);

    if (!item) {
      item = {
        eventId: registration.event.id,
        eventName: registration.event.name,
        eventDate: registration.event.eventDate,
        seatCapacity: registration.event.seatCapacity,
        pendingCount: 0,
        universities: new Map(),
      };

      grouped.set(registration.eventId, item);
    }

    item.pendingCount += 1;

    const universityName =
      registration.participant?.university?.name ??
      "University not recorded";

    item.universities.set(
      universityName,
      (item.universities.get(universityName) ?? 0) + 1
    );
  }

  return Array.from(grouped.values()).map((item) => ({
    ...item,
    universities: Array.from(item.universities.entries()).map(
      ([name, count]) => ({ name, count })
    ),
  }));
}

export async function reserveApprovedSeat(
  tx: Prisma.TransactionClient,
  eventId: string
) {
  const event = await tx.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      status: true,
      deadline: true,
      seatCapacity: true,
    },
  });

  if (!event || event.status !== "OPEN") {
    throw new Error("This event is not accepting registrations.");
  }

  if (event.deadline < new Date()) {
    throw new Error("The registration deadline has passed.");
  }

  // A null capacity means unlimited seats.
  if (event.seatCapacity === null) {
    return;
  }

  const reservedSeats = await tx.registration.count({
    where: {
      eventId,
      seatReserved: true,
      reviewStatus: "APPROVED",
    },
  });

  if (reservedSeats >= event.seatCapacity) {
    throw new Error(
      "All seats for this event have already been reserved."
    );
  }
}
