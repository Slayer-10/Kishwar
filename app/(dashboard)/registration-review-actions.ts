"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reserveApprovedSeat } from "@/lib/registration-review";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { validateRegistrationTransition } from "@/lib/registrations/transition-rules";

export type ReviewQueueEvidence = {
  id: string;
  type: "STUDENT_DOCUMENT" | "PAYMENT_PROOF";
  reviewStatus: string;
  signedUrl: string | null;
  originalFileName: string | null;
};

export type ReviewQueueItem = {
  id: string;
  eventId: string;
  eventName: string;
  source: string;
  reviewStatus: string;
  accommodationSelection: string;
  accommodationGender: string | null;
  createdAt: string;
  ambassadorId: string | null;
  participant: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    cnic: string | null;
    universityId: string | null;
    universityName: string;
  } | null;
  evidence: ReviewQueueEvidence[];
};

async function requireReviewAccess(audience: "AMBASSADOR" | "ADMIN") {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  if (audience === "AMBASSADOR") {
    if (user.role !== "AMBASSADOR" || !user.ambassador) {
      redirect("/login");
    }

    return {
      user,
      ambassadorId: user.ambassador.id,
    };
  }

  if (user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  return {
    user,
    ambassadorId: null,
  };
}

export async function reviewRegistrationAction(
  registrationId: string,
  decision: "APPROVE" | "REJECT",
  audience: "AMBASSADOR" | "ADMIN",
  rejectionReason?: string
) {
  const { user, ambassadorId } = await requireReviewAccess(audience);

  if (!registrationId) {
    throw new Error("Registration ID is required.");
  }

  if (decision === "REJECT" && !rejectionReason?.trim()) {
    throw new Error("Please provide a rejection reason.");
  }

  await prisma.$transaction(async (tx) => {
    const registration = await tx.registration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        eventId: true,
        ambassadorId: true,
        source: true,
        reviewStatus: true,
      },
    });

    if (!registration || registration.source !== "PUBLIC") {
      throw new Error("Registration not found.");
    }

    if (
      audience === "AMBASSADOR" &&
      (
        registration.ambassadorId !== ambassadorId ||
        registration.reviewStatus !== "PENDING_AMBASSADOR"
      )
    ) {
      throw new Error(
        "This request is not pending with your Ambassador account."
      );
    }

    if (
      audience === "ADMIN" &&
      (
        registration.ambassadorId !== null ||
        registration.reviewStatus !== "PENDING_ADMIN"
      )
    ) {
      throw new Error(
        "This request is not pending in the Admin queue."
      );
    }

    if (decision === "REJECT") {
      await tx.registration.update({
        where: { id: registration.id },
        data: {
          reviewStatus: "REJECTED",
          status: "REJECTED",
          seatReserved: false,
          rejectionReason: rejectionReason!.trim().slice(0, 1000),
        },
      });

      await tx.registrationEvidence.updateMany({
        where: { registrationId: registration.id },
        data: {
          reviewStatus: "REJECTED",
          reviewedByUserId: user.id,
          reviewedAt: new Date(),
        },
      });

      return;
    }

    // Check evidence requirements for approval
    const evidenceRecords = await tx.registrationEvidence.findMany({
      where: { registrationId: registration.id },
      select: { type: true },
    });

    const hasStudentDoc = evidenceRecords.some((e) => e.type === "STUDENT_DOCUMENT");
    const hasPaymentProof = evidenceRecords.some((e) => e.type === "PAYMENT_PROOF");

    if (!hasStudentDoc) {
      throw new Error("Cannot approve registration: Required student ID evidence is missing.");
    }

    if (audience === "ADMIN" && !hasPaymentProof) {
      throw new Error("Cannot approve registration: Required payment screenshot is missing for independent Admin review.");
    }

    // Serialize approvals for the same event so two reviewers
    // cannot reserve the final seat simultaneously.
    await tx.$queryRaw`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${registration.eventId}, 0)
      )
    `;

    // Recheck after acquiring the event lock.
    const current = await tx.registration.findUnique({
      where: { id: registration.id },
      select: { reviewStatus: true },
    });

    const expectedStatus =
      audience === "AMBASSADOR"
        ? "PENDING_AMBASSADOR"
        : "PENDING_ADMIN";

    if (current?.reviewStatus !== expectedStatus) {
      throw new Error("This request has already been reviewed.");
    }

    await reserveApprovedSeat(tx, registration.eventId);

    await tx.registration.update({
      where: { id: registration.id },
      data: {
        reviewStatus: "APPROVED",
        status: "PENDING",
        seatReserved: true,
        rejectionReason: null,
        ...(audience === "AMBASSADOR"
          ? { ambassadorApprovedAt: new Date() }
          : { adminApprovedAt: new Date() }),
      },
    });

    await tx.registrationEvidence.updateMany({
      where: { registrationId: registration.id },
      data: {
        reviewStatus: "VERIFIED",
        reviewedByUserId: user.id,
        reviewedAt: new Date(),
      },
    });
  });

  revalidatePath("/ambassador");
  revalidatePath("/ambassador/requests");
  revalidatePath("/admin");
  revalidatePath("/admin/registration-requests");
  revalidatePath("/admin/registrations");

  // Fetch trusted recipient & event details after transaction completes
  try {
    const updatedReg = await prisma.registration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        rejectionReason: true,
        event: { select: { name: true } },
        participant: { select: { fullName: true, email: true, phone: true } },
      },
    });

    if (updatedReg?.participant) {
      const eventName = updatedReg.event.name;
      const participant = updatedReg.participant;

      if (decision === "APPROVE") {
        await dispatchNotification({
          event: "registration_approved",
          recipientName: participant.fullName,
          recipientEmail: participant.email,
          recipientPhone: participant.phone,
          subject: `Registration Approved - ${eventName}`,
          message: `Dear ${participant.fullName}, your registration for ${eventName} has been approved! Your seat is reserved.`,
          idempotencyKey: `app_${registrationId}`,
        });
      } else {
        await dispatchNotification({
          event: "registration_rejected",
          recipientName: participant.fullName,
          recipientEmail: participant.email,
          recipientPhone: participant.phone,
          subject: `Registration Update - ${eventName}`,
          message: `Dear ${participant.fullName}, your registration for ${eventName} was not approved. Reason: ${updatedReg.rejectionReason || "Requirements not met."}`,
          idempotencyKey: `rej_${registrationId}`,
        });
      }
    }
  } catch (notifyErr) {
    console.error("[reviewRegistrationAction] Notification error:", notifyErr);
  }

  return {
    success: decision === "APPROVE"
      ? "Registration approved and its seat reserved."
      : "Registration rejected.",
  };
}

export async function getPendingEventRegistrationsAction(
  eventId: string,
  audience: "AMBASSADOR" | "ADMIN"
): Promise<ReviewQueueItem[]> {
  const { ambassadorId } = await requireReviewAccess(audience);

  if (!eventId) {
    throw new Error("Event ID is required.");
  }

  const where =
    audience === "AMBASSADOR"
      ? {
          eventId,
          source: "PUBLIC" as const,
          reviewStatus: "PENDING_AMBASSADOR" as const,
          ambassadorId: ambassadorId!,
        }
      : {
          eventId,
          source: "PUBLIC" as const,
          reviewStatus: "PENDING_ADMIN" as const,
          ambassadorId: null,
        };

  const registrations = await prisma.registration.findMany({
    where,
    select: {
      id: true,
      eventId: true,
      source: true,
      reviewStatus: true,
      accommodationSelection: true,
      accommodationGender: true,
      createdAt: true,
      ambassadorId: true,
      event: {
        select: {
          name: true,
        },
      },
      participant: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          cnic: true,
          universityId: true,
          university: {
            select: {
              name: true,
            },
          },
        },
      },
      evidence: {
        select: {
          id: true,
          type: true,
          reviewStatus: true,
          storagePath: true,
          originalFileName: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const supabase = createSupabaseAdminClient();

  const items: ReviewQueueItem[] = await Promise.all(
    registrations.map(async (reg) => {
      const evidenceList: ReviewQueueEvidence[] = await Promise.all(
        reg.evidence.map(async (ev) => {
          let signedUrl: string | null = null;
          if (ev.storagePath) {
            try {
              const { data } = await supabase.storage
                .from("kishwar-registration-evidence")
                .createSignedUrl(ev.storagePath, 3600);
              signedUrl = data?.signedUrl ?? null;
            } catch {
              signedUrl = null;
            }
          }

          return {
            id: ev.id,
            type: ev.type,
            reviewStatus: ev.reviewStatus,
            signedUrl,
            originalFileName: ev.originalFileName,
          };
        })
      );

      return {
        id: reg.id,
        eventId: reg.eventId,
        eventName: reg.event.name,
        source: reg.source,
        reviewStatus: reg.reviewStatus,
        accommodationSelection: reg.accommodationSelection,
        accommodationGender: reg.accommodationGender,
        createdAt: reg.createdAt.toISOString(),
        ambassadorId: reg.ambassadorId,
        participant: reg.participant
          ? {
              id: reg.participant.id,
              fullName: reg.participant.fullName,
              email: reg.participant.email,
              phone: reg.participant.phone,
              cnic: reg.participant.cnic,
              universityId: reg.participant.universityId,
              universityName:
                reg.participant.university?.name ?? "University not recorded",
            }
          : null,
        evidence: evidenceList,
      };
    })
  );

  return items;
}
