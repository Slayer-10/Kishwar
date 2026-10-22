'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { randomInt, randomUUID } from 'crypto';
import type { RegistrationType, EventStatus } from '@prisma/client';
import { encryptAmbassadorPassword } from '@/lib/encryption';

function generateAmbassadorPassword(): string {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

  return Array.from(
    { length: 8 },
    () => chars[randomInt(chars.length)]
  ).join('');
}

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized');
  }
  return user;
}

function parseEventFormData(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;
  const category = String(formData.get('category') ?? '').trim() || null;
  const registrationFeeRaw = String(formData.get('registrationFee') ?? '');
  const prizeMoneyRaw = String(formData.get('prizeMoney') ?? '');
  const registrationType = String(formData.get('registrationType') ?? 'INDIVIDUAL') as RegistrationType;
  const minTeamSizeRaw = String(formData.get('minTeamSize') ?? '');
  const maxTeamSizeRaw = String(formData.get('maxTeamSize') ?? '');
  const deadlineRaw = String(formData.get('deadline') ?? '');
  const eventDateRaw = String(formData.get('eventDate') ?? '');
  const venue = String(formData.get('venue') ?? '').trim() || null;
  const rules = String(formData.get('rules') ?? '').trim() || null;
  const status = String(formData.get('status') ?? 'DRAFT') as EventStatus;

  if (!name) return { fieldError: 'Event name is required.' } as const;
  if (!registrationFeeRaw || isNaN(Number(registrationFeeRaw))) {
    return { fieldError: 'Registration fee must be a valid number.' } as const;
  }
  if (!deadlineRaw) return { fieldError: 'Registration deadline is required.' } as const;
  if (!eventDateRaw) return { fieldError: 'Event date is required.' } as const;

  const deadline = new Date(deadlineRaw);
  const eventDate = new Date(eventDateRaw);

  if (isNaN(deadline.getTime())) return { fieldError: 'Invalid deadline date.' } as const;
  if (isNaN(eventDate.getTime())) return { fieldError: 'Invalid event date.' } as const;

  if (registrationType === 'TEAM' || registrationType === 'BOTH') {
    if (!minTeamSizeRaw || !maxTeamSizeRaw) {
      return { fieldError: 'Min and max team size are required for team-based registration.' } as const;
    }
    if (Number(minTeamSizeRaw) > Number(maxTeamSizeRaw)) {
      return { fieldError: 'Min team size cannot be greater than max team size.' } as const;
    }
  }

  return {
    data: {
      name,
      description,
      category,
      registrationFee: Number(registrationFeeRaw),
      prizeMoney: prizeMoneyRaw ? Number(prizeMoneyRaw) : null,
      registrationType,
      minTeamSize: minTeamSizeRaw ? Number(minTeamSizeRaw) : null,
      maxTeamSize: maxTeamSizeRaw ? Number(maxTeamSizeRaw) : null,
      deadline,
      eventDate,
      venue,
      rules,
      status,
    },
  } as const;
}

export async function createEventAction(prevState: { error?: string }, formData: FormData) {
  await requireSuperAdmin();

  const parsed = parseEventFormData(formData);
  if ('fieldError' in parsed) {
    return { error: parsed.fieldError };
  }

  try {
    await prisma.event.create({ data: parsed.data });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return { error: 'An event with this name already exists.' };
    }
    return { error: 'Failed to create event. Please try again.' };
  }

  revalidatePath('/admin');
  redirect('/admin');
}

export async function updateEventAction(
  eventId: string,
  prevState: { error?: string },
  formData: FormData
) {
  await requireSuperAdmin();

  const parsed = parseEventFormData(formData);
  if ('fieldError' in parsed) {
    return { error: parsed.fieldError };
  }

  try {
    await prisma.event.update({ where: { id: eventId }, data: parsed.data });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return { error: 'An event with this name already exists.' };
    }
    return { error: 'Failed to update event. Please try again.' };
  }

  revalidatePath('/admin');
  redirect('/admin');
}

export async function deleteEventAction(eventId: string) {
  const admin = await requireSuperAdmin();

  const [teamCount, registrationCount] = await Promise.all([
    prisma.team.count({ where: { eventId } }),
    prisma.registration.count({ where: { eventId } }),
  ]);

  if (teamCount > 0 || registrationCount > 0) {
    throw new Error(
      'This event already has teams or registrations and cannot be deleted. Set its status to CANCELLED instead.'
    );
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });

  await prisma.event.delete({ where: { id: eventId } });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'DELETE',
      targetTable: 'Event',
      targetId: eventId,
      details: { name: event?.name },
    },
  });

  revalidatePath('/admin');
}

export async function createUniversityAction(formData: FormData) {
  await requireSuperAdmin();

  const name = String(formData.get('name') ?? '').trim();
  const city = String(formData.get('city') ?? '').trim() || null;

  if (!name) {
    redirect('/admin/universities?error=University name is required.');
  }

  try {
    await prisma.university.create({ data: { name, city } });
  } catch (err: any) {
    if (err.code === 'P2002') {
      redirect('/admin/universities?error=A university with this name already exists.');
    }
    redirect('/admin/universities?error=Failed to create university.');
  }

  revalidatePath('/admin/universities');
  redirect('/admin/universities');
}

export async function deleteUniversityAction(universityId: string) {
  const admin = await requireSuperAdmin();

  const [ambassadorCount, teamCount, participantCount] = await Promise.all([
    prisma.ambassador.count({ where: { universityId } }),
    prisma.team.count({ where: { universityId } }),
    prisma.participant.count({ where: { universityId } }),
  ]);

  if (ambassadorCount > 0 || teamCount > 0 || participantCount > 0) {
    throw new Error('This university has ambassadors, teams or participants linked to it and cannot be deleted.');
  }

  const university = await prisma.university.findUnique({ where: { id: universityId } });

  await prisma.university.delete({ where: { id: universityId } });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'DELETE',
      targetTable: 'University',
      targetId: universityId,
      details: { name: university?.name },
    },
  });

  revalidatePath('/admin/universities');
}

export async function createAnnouncementAction(formData: FormData) {
  await requireSuperAdmin();

  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();

  if (!title) {
    redirect('/admin/announcements?error=Title is required.');
  }
  if (!body) {
    redirect('/admin/announcements?error=Body is required.');
  }

  await prisma.announcement.create({ data: { title, body } });

  revalidatePath('/admin/announcements');
  redirect('/admin/announcements');
}

export async function togglePublishAnnouncementAction(announcementId: string, isPublished: boolean) {
  await requireSuperAdmin();

  await prisma.announcement.update({
    where: { id: announcementId },
    data: { isPublished, publishedAt: isPublished ? new Date() : null },
  });

  revalidatePath('/admin/announcements');
}

export async function deleteAnnouncementAction(announcementId: string) {
  const admin = await requireSuperAdmin();

  const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });

  await prisma.announcement.delete({ where: { id: announcementId } });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'DELETE',
      targetTable: 'Announcement',
      targetId: announcementId,
      details: { title: announcement?.title },
    },
  });

  revalidatePath('/admin/announcements');
}

export async function createAmbassadorAction(formData: FormData) {
  const admin = await requireSuperAdmin();

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const universityId = String(formData.get('universityId') ?? '');
  const ambassadorCode = String(formData.get('ambassadorCode') ?? '').trim();

  if (!email || !password || !universityId || !ambassadorCode) {
    redirect('/admin/ambassadors?error=All fields are required.');
  }
  if (password.length < 8) {
    redirect('/admin/ambassadors?error=Password must be at least 8 characters.');
  }

  let passwordEncrypted: string;
  try {
    passwordEncrypted = encryptAmbassadorPassword(password);
  } catch (encErr: any) {
    redirect(`/admin/ambassadors?error=${encodeURIComponent('Encryption error: ' + (encErr?.message ?? 'Failed to encrypt password.'))}`);
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    redirect('/admin/ambassadors?error=A user with this email already exists.');
  }

  const existingAmbassadorForUni = await prisma.ambassador.findFirst({
    where: { universityId },
  });
  if (existingAmbassadorForUni) {
    redirect('/admin/ambassadors?error=' + encodeURIComponent('This university already has a campus ambassador.'));
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    redirect(`/admin/ambassadors?error=${encodeURIComponent(error?.message ?? 'Failed to create account.')}`);
  }

  try {
    await prisma.user.create({
      data: { id: data.user!.id, email, role: 'AMBASSADOR' },
    });

    await prisma.ambassador.create({
      data: {
        userId: data.user!.id,
        universityId,
        ambassadorCode,
        passwordEncrypted,
      },
    });
  } catch (err: any) {
    await supabaseAdmin.auth.admin.deleteUser(data.user!.id);

    if (err.code === 'P2002') {
      const target = err.meta?.target;
      if (Array.isArray(target) && target.includes('universityId')) {
        redirect('/admin/ambassadors?error=' + encodeURIComponent('This university already has a campus ambassador.'));
      }
      redirect('/admin/ambassadors?error=This ambassador code is already in use.');
    }
    redirect('/admin/ambassadors?error=Failed to create ambassador record.');
  }

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'CREATE',
      targetTable: 'Ambassador',
      targetId: data.user!.id,
      details: { email, universityId, ambassadorCode },
    },
  });

  revalidatePath('/admin/ambassadors');
  redirect('/admin/ambassadors');
}

export async function deleteAmbassadorAction(ambassadorId: string) {
  const admin = await requireSuperAdmin();

  const ambassador = await prisma.ambassador.findUnique({
    where: { id: ambassadorId },
    include: {
      user: {
        include: {
          participant: {
            include: {
              registrations: { select: { id: true } },
              captainOfTeams: { select: { id: true } },
              teamMemberships: { select: { id: true } },
              registrationEvidence: { select: { id: true } },
            },
          },
          _count: {
            select: {
              auditLogs: true,
              verifiedPayments: true,
              verifiedCampusPayments: true,
              ambassadorRequests: true,
              collectiveInvoicesGenerated: true,
              collectiveInvoicesPaidConfirmed: true,
              uploadedRegistrationEvidence: true,
              reviewedRegistrationEvidence: true,
              registrationsPaymentConfirmed: true,
            },
          },
        },
      },
      _count: {
        select: {
          teams: true,
          registrations: true,
          campusPayments: true,
          collectiveInvoices: true,
        },
      },
    },
  });

  if (!ambassador) {
    throw new Error("Ambassador not found.");
  }

  // Financial records must not be destroyed or orphaned.
  if (
    ambassador._count.campusPayments > 0 ||
    ambassador._count.collectiveInvoices > 0
  ) {
    throw new Error(
      "This ambassador has financial records. Resolve those records before deleting the ambassador assignment."
    );
  }

  const participant = ambassador.user.participant;

  const hasParticipantEventHistory = Boolean(
    participant &&
      (
        participant.registrations.length > 0 ||
        participant.captainOfTeams.length > 0 ||
        participant.teamMemberships.length > 0 ||
        participant.registrationEvidence.length > 0
      )
  );

  const hasAmbassadorEventHistory =
    ambassador._count.teams > 0 ||
    ambassador._count.registrations > 0;

  const userCounts = ambassador.user._count;

  // User relations that require the User row to remain in the database.
  const hasOtherUserDependencies =
    userCounts.auditLogs > 0 ||
    userCounts.verifiedPayments > 0 ||
    userCounts.verifiedCampusPayments > 0 ||
    userCounts.ambassadorRequests > 0 ||
    userCounts.collectiveInvoicesGenerated > 0 ||
    userCounts.collectiveInvoicesPaidConfirmed > 0 ||
    userCounts.uploadedRegistrationEvidence > 0 ||
    userCounts.reviewedRegistrationEvidence > 0 ||
    userCounts.registrationsPaymentConfirmed > 0;

  const preserveAccount =
    hasParticipantEventHistory ||
    hasAmbassadorEventHistory ||
    hasOtherUserDependencies;

  const universityId = ambassador.universityId;
  const userId = ambassador.userId;

  await prisma.$transaction(async (tx) => {
    // Preserve all teams and registrations; remove only the optional
    // references to this ambassador assignment.
    await tx.team.updateMany({
      where: { ambassadorId },
      data: { ambassadorId: null },
    });

    await tx.registration.updateMany({
      where: { ambassadorId },
      data: { ambassadorId: null },
    });

    if (preserveAccount) {
      // Keep the account and its history, but revoke ambassador status.
      await tx.ambassador.delete({
        where: { id: ambassadorId },
      });

      await tx.user.update({
        where: { id: userId },
        data: { role: "PARTICIPANT" },
      });
    } else {
      // No event history or other User dependencies were found.
      if (participant) {
        // Requests can still refer to the participant or university.
        // Preserve the requests while removing the participant link.
        await tx.ambassadorRequest.updateMany({
          where: { participantId: participant.id },
          data: { participantId: null },
        });

        await tx.participant.delete({
          where: { id: participant.id },
        });
      }

      await tx.ambassador.delete({
        where: { id: ambassadorId },
      });

      await tx.user.delete({
        where: { id: userId },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: admin.id,
        action: "DELETE",
        targetTable: "Ambassador",
        targetId: ambassadorId,
        details: {
          ambassadorCode: ambassador.ambassadorCode,
          userId,
          universityId,
          outcome: preserveAccount
            ? "Ambassador assignment removed; account and history preserved."
            : "Ambassador, participant (if present), and database user removed.",
        },
      },
    });

    // Delete the university only when it has no remaining references.
    // This is checked after removing the ambassador assignment.
    const [
      remainingAmbassadors,
      remainingParticipants,
      remainingTeams,
      remainingRequests,
    ] = await Promise.all([
      tx.ambassador.count({ where: { universityId } }),
      tx.participant.count({ where: { universityId } }),
      tx.team.count({ where: { universityId } }),
      tx.ambassadorRequest.count({ where: { universityId } }),
    ]);

    if (
      remainingAmbassadors === 0 &&
      remainingParticipants === 0 &&
      remainingTeams === 0 &&
      remainingRequests === 0
    ) {
      await tx.university.delete({
        where: { id: universityId },
      });
    }
  });

  // Supabase Auth is external to the Prisma transaction.
  // A failure here must be reported; it cannot roll back the database.
  if (!preserveAccount) {
    const supabaseAdmin = createSupabaseAdminClient();

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      throw new Error(
        `Database deletion succeeded, but Supabase Auth deletion failed for user ${userId}: ${error.message}. Retry Auth cleanup for this user.`
      );
    }
  }

  revalidatePath("/admin/ambassadors");
  revalidatePath("/admin/ambassador-requests");
  revalidatePath("/admin/universities");
}

function revalidatePaymentPages() {
  revalidatePath('/admin/payments');
  revalidatePath('/participant/payments');
  revalidatePath('/participant/tickets');
  revalidatePath('/ambassador');
  revalidatePath('/ambassador/payments');
  revalidatePath('/ambassador/tickets');
}

async function verifyPaymentCore(paymentId: string, adminId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { invoice: true },
  });

  if (!payment || payment.verificationStatus !== 'SUBMITTED') return;

  const registrationId = payment.invoice.registrationId;
  const code = `TCK-${randomUUID().slice(0, 8).toUpperCase()}`;

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: { verificationStatus: 'VERIFIED', verifiedBy: adminId },
    }),
    prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: { status: 'PAID' },
    }),
    prisma.registration.update({
      where: { id: registrationId },
      data: { status: 'CONFIRMED' },
    }),
    prisma.ticket.upsert({
      where: { registrationId },
      create: { registrationId, ticketCode: code, qrData: code, status: 'VALID' },
      update: {},
    }),
    prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'VERIFY',
        targetTable: 'Payment',
        targetId: paymentId,
        details: {
          amount: payment.amount.toString(),
          method: payment.method,
          batchId: payment.batchId,
        },
      },
    }),
  ]);
}

async function rejectPaymentCore(paymentId: string, adminId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { invoice: true },
  });

  if (!payment || payment.verificationStatus !== 'SUBMITTED') return;

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: { verificationStatus: 'REJECTED', verifiedBy: adminId },
    }),
    prisma.registration.update({
      where: { id: payment.invoice.registrationId },
      data: { status: 'INVOICED' },
    }),
    prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'REJECT',
        targetTable: 'Payment',
        targetId: paymentId,
        details: {
          amount: payment.amount.toString(),
          method: payment.method,
          batchId: payment.batchId,
        },
      },
    }),
  ]);
}

export async function verifyPaymentAction(paymentId: string) {
  const admin = await requireSuperAdmin();
  await verifyPaymentCore(paymentId, admin.id);
  revalidatePaymentPages();
}

export async function rejectPaymentAction(paymentId: string) {
  const admin = await requireSuperAdmin();
  await rejectPaymentCore(paymentId, admin.id);
  revalidatePaymentPages();
}

export async function verifyBatchAction(batchId: string) {
  const admin = await requireSuperAdmin();
  const payments = await prisma.payment.findMany({
    where: { batchId, verificationStatus: 'SUBMITTED' },
    select: { id: true },
  });
  for (const p of payments) {
    await verifyPaymentCore(p.id, admin.id);
  }
  revalidatePaymentPages();
}

export async function rejectBatchAction(batchId: string) {
  const admin = await requireSuperAdmin();
  const payments = await prisma.payment.findMany({
    where: { batchId, verificationStatus: 'SUBMITTED' },
    select: { id: true },
  });
  for (const p of payments) {
    await rejectPaymentCore(p.id, admin.id);
  }
  revalidatePaymentPages();
}

export type AmbassadorApprovalResult = {
  error?: string;
  credentials?: {
    email: string;
    password: string;
    ambassadorCode: string;
  };
};

export async function approveAmbassadorRequestAction(
  prevState: AmbassadorApprovalResult | FormData | null | undefined,
  formDataArg?: FormData
): Promise<AmbassadorApprovalResult> {
  const formData =
    formDataArg instanceof FormData
      ? formDataArg
      : prevState instanceof FormData
      ? prevState
      : null;

  if (!formData) {
    return { error: 'Request data is missing.' };
  }

  const admin = await getCurrentUser();

  if (!admin || admin.role !== 'SUPER_ADMIN') {
    return { error: 'Only Super Admin can approve Ambassador requests.' };
  }

  const requestId = String(formData.get('requestId') ?? '').trim();
  const universityId = String(formData.get('universityId') ?? '').trim();
  const ambassadorCode = String(formData.get('ambassadorCode') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!requestId || !universityId || !ambassadorCode || !password) {
    return { error: 'Request, university, Ambassador code, and login password are required.' };
  }

  if (password.length < 8) {
    return { error: 'Login password must be at least 8 characters long.' };
  }

  let passwordEncrypted: string;
  try {
    passwordEncrypted = encryptAmbassadorPassword(password);
  } catch (encErr: any) {
    return {
      error: `Server encryption error: ${encErr?.message ?? 'Password encryption failed. Please check server configuration.'}`,
    };
  }

  const request = await prisma.ambassadorRequest.findUnique({
    where: { id: requestId },
    include: {
      participant: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!request) {
    return { error: 'Ambassador request not found.' };
  }

  if (request.status !== 'PENDING') {
    return { error: 'This request has already been reviewed.' };
  }

  const university = await prisma.university.findUnique({
    where: { id: universityId },
  });

  if (!university) {
    return { error: 'University not found.' };
  }

  const existingAmbassadorForUni = await prisma.ambassador.findFirst({
    where: { universityId },
  });
  if (existingAmbassadorForUni) {
    return { error: 'This university already has a campus ambassador.' };
  }

  const existingCode = await prisma.ambassador.findUnique({
    where: { ambassadorCode },
  });

  if (existingCode) {
    return { error: 'That Ambassador code is already in use.' };
  }

  const applicantEmail = (request.participant?.email ?? request.email ?? '').toLowerCase().trim();

  if (!applicantEmail) {
    return { error: 'Applicant email is required for approval.' };
  }

  const supabaseAdmin = createSupabaseAdminClient();

  let targetUserId: string;
  let newlyCreatedAuthUserId: string | null = null;
  const existingUser = request.participant?.user ?? (await prisma.user.findUnique({ where: { email: applicantEmail } }));

  if (existingUser) {
    targetUserId = existingUser.id;

    const existingAmbassador = await prisma.ambassador.findUnique({
      where: { userId: targetUserId },
    });

    if (existingAmbassador) {
      return { error: 'This applicant is already an Ambassador.' };
    }

    const { data: authUserCheck, error: authUserError } =
      await supabaseAdmin.auth.admin.getUserById(targetUserId);

    if (authUserError || !authUserCheck.user || authUserCheck.user.id !== targetUserId) {
      return {
        error: 'Could not verify matching authentication account. No approval was completed.',
      };
    }

    if (authUserCheck.user.email?.toLowerCase() !== applicantEmail) {
      return {
        error: 'Authentication email does not match user account. No approval was completed.',
      };
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        password,
        email: applicantEmail,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      return {
        error: 'Could not set the Ambassador login credentials. No approval was completed.',
      };
    }
  } else {
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: applicantEmail,
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      return {
        error: 'Could not create the Ambassador login credentials. No approval was completed.',
      };
    }

    targetUserId = authData.user.id;
    newlyCreatedAuthUserId = authData.user.id;

    try {
      await prisma.user.create({
        data: {
          id: targetUserId,
          email: applicantEmail,
          role: 'AMBASSADOR',
          isActive: true,
        },
      });
    } catch (err: any) {
      await supabaseAdmin.auth.admin.deleteUser(newlyCreatedAuthUserId).catch(() => {});
      return {
        error: 'Could not initialize the Ambassador user profile. No approval was completed.',
      };
    }
  }

  try {
    // Link an existing Participant record to this account if one can be found.
    // Do NOT create a Participant; an Ambassador does not require one.
    let existingParticipantId: string | null = null;

    const participantByUserId = await prisma.participant.findUnique({
      where: { userId: targetUserId },
      select: { id: true, universityId: true },
    });

    if (participantByUserId) {
      existingParticipantId = participantByUserId.id;
      // Backfill universityId if missing.
      if (!participantByUserId.universityId) {
        await prisma.participant.update({
          where: { id: participantByUserId.id },
          data: { universityId },
        });
      }
    } else if (request.participantId) {
      const participantByRequestId = await prisma.participant.findUnique({
        where: { id: request.participantId },
        select: { id: true, universityId: true },
      });
      if (participantByRequestId) {
        existingParticipantId = participantByRequestId.id;
        // Link and backfill universityId.
        await prisma.participant.update({
          where: { id: participantByRequestId.id },
          data: {
            userId: targetUserId,
            universityId: participantByRequestId.universityId ?? universityId,
          },
        });
      }
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: targetUserId },
        data: { role: 'AMBASSADOR', isActive: true },
      }),
      prisma.ambassador.create({
        data: {
          userId: targetUserId,
          universityId,
          ambassadorCode,
          passwordEncrypted,
        },
      }),
      prisma.ambassadorRequest.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          participantId: existingParticipantId,
          reviewedById: admin.id,
          reviewedAt: new Date(),
        },
      }),
    ]);
  } catch (dbErr: any) {
    if (newlyCreatedAuthUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(newlyCreatedAuthUserId);
      } catch {
        // ignore rollback errors
      }
      try {
        await prisma.user.delete({ where: { id: newlyCreatedAuthUserId } });
      } catch {
        // ignore rollback errors
      }
      return {
        error: `Failed to complete Ambassador database approval: ${dbErr?.message ?? 'Unknown database error'}`,
      };
    }

    return {
      error: `Database approval failed after updating authentication credentials: ${dbErr?.message ?? 'Unknown database error'}. The login password was set in Supabase Auth, but Ambassador database records could not be finalized. Please reset credentials or retry.`,
    };
  }

  revalidatePath('/admin/ambassador-requests');
  revalidatePath('/admin/ambassadors');
  revalidatePath('/ambassador-application');

  return {
    credentials: {
      email: applicantEmail,
      password,
      ambassadorCode,
    },
  };
}

export async function resetAmbassadorPasswordAction(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const admin = await getCurrentUser();

  if (!admin || admin.role !== 'SUPER_ADMIN') {
    return { error: 'Only Super Admin can reset Ambassador passwords.' };
  }

  const ambassadorId = String(formData.get('ambassadorId') ?? '').trim();
  const newPassword = String(formData.get('newPassword') ?? '');

  if (!ambassadorId || !newPassword) {
    return { error: 'Ambassador ID and new password are required.' };
  }

  if (newPassword.length < 8) {
    return { error: 'Password must be at least 8 characters long.' };
  }

  const ambassador = await prisma.ambassador.findUnique({
    where: { id: ambassadorId },
    include: { user: true },
  });

  if (!ambassador) {
    return { error: 'Ambassador record not found.' };
  }

  let passwordEncrypted: string;
  try {
    passwordEncrypted = encryptAmbassadorPassword(newPassword);
  } catch (encErr: any) {
    return {
      error: `Encryption error: ${encErr?.message ?? 'Failed to encrypt password.'}`,
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: authUser, error: authCheckError } =
    await supabaseAdmin.auth.admin.getUserById(ambassador.userId);

  if (authCheckError || !authUser?.user) {
    return { error: 'Could not verify linked Supabase Auth user.' };
  }

  const { error: updateAuthError } =
    await supabaseAdmin.auth.admin.updateUserById(ambassador.userId, {
      password: newPassword,
    });

  if (updateAuthError) {
    return {
      error: `Failed to update password in authentication system: ${updateAuthError.message}`,
    };
  }

  try {
    await prisma.ambassador.update({
      where: { id: ambassadorId },
      data: { passwordEncrypted },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'UPDATE',
        targetTable: 'Ambassador',
        targetId: ambassadorId,
        details: {
          ambassadorCode: ambassador.ambassadorCode,
          userId: ambassador.userId,
          actionDescription: 'Reset ambassador password',
        },
      },
    });
  } catch (dbErr: any) {
    return {
      error: `Password was updated in auth, but failed to save encrypted password to database: ${dbErr?.message ?? 'Unknown database error'}`,
    };
  }

  revalidatePath('/admin/ambassadors');
  return { success: true };
}

export async function rejectAmbassadorRequestAction(
  formData: FormData
) {
  const admin = await getCurrentUser();

  if (!admin || admin.role !== 'SUPER_ADMIN') {
    throw new Error('Only Super Admin can reject Ambassador requests.');
  }

  const requestId = String(
    formData.get('requestId') ?? ''
  ).trim();

  if (!requestId) {
    throw new Error('Request ID is required.');
  }

  const request = await prisma.ambassadorRequest.findUnique({
    where: {
      id: requestId,
    },
  });

  if (!request) {
    throw new Error('Ambassador request not found.');
  }

  if (request.status !== 'PENDING') {
    throw new Error('This request has already been reviewed.');
  }

  await prisma.ambassadorRequest.update({
    where: {
      id: requestId,
    },
    data: {
      status: 'REJECTED',
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
  });

  revalidatePath('/admin/ambassador-requests');
}

export async function verifyCampusPaymentAction(campusPaymentId: string) {
  const admin = await requireSuperAdmin();

  const campusPayment = await prisma.campusPayment.findUnique({
    where: { id: campusPaymentId },
    include: { invoices: true },
  });

  if (!campusPayment) {
    throw new Error('Campus payment not found.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.campusPayment.update({
      where: { id: campusPaymentId },
      data: {
        verificationStatus: 'VERIFIED',
        verifiedBy: admin.id,
      },
    });

    await tx.invoice.updateMany({
      where: { campusPaymentId },
      data: { status: 'PAID' },
    });

    const registrationIds = campusPayment.invoices.map((inv) => inv.registrationId);
    if (registrationIds.length > 0) {
      await tx.registration.updateMany({
        where: { id: { in: registrationIds } },
        data: { status: 'CONFIRMED' },
      });
    }
  });

  revalidatePath('/admin/payments');
  revalidatePath('/ambassador/payments');
}

export async function rejectCampusPaymentAction(campusPaymentId: string) {
  const admin = await requireSuperAdmin();

  const campusPayment = await prisma.campusPayment.findUnique({
    where: { id: campusPaymentId },
  });

  if (!campusPayment) {
    throw new Error('Campus payment not found.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.campusPayment.update({
      where: { id: campusPaymentId },
      data: {
        verificationStatus: 'REJECTED',
      },
    });

    await tx.invoice.updateMany({
      where: { campusPaymentId },
      data: { campusPaymentId: null },
    });
  });

  revalidatePath('/admin/payments');
  revalidatePath('/ambassador/payments');
}





