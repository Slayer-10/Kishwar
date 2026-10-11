'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { randomInt, randomUUID } from 'crypto';
import type { RegistrationType, EventStatus } from '@prisma/client';

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
    throw new Error('Ambassador not found.');
  }

  // These records have required/restricting relationships to Ambassador.
  // Do not destroy financial history to force deletion.
  if (
    ambassador._count.campusPayments > 0 ||
    ambassador._count.collectiveInvoices > 0
  ) {
    throw new Error(
      'This ambassador has financial records. Preserve those records and resolve their ambassador references before deleting the assignment.'
    );
  }

  const participant = ambassador.user.participant;

  const hasParticipantHistory = Boolean(
    participant &&
      (
        participant.registrations.length > 0 ||
        participant.captainOfTeams.length > 0 ||
        participant.teamMemberships.length > 0 ||
        participant.registrationEvidence.length > 0
      )
  );

  const hasAmbassadorHistory =
    ambassador._count.teams > 0 ||
    ambassador._count.registrations > 0 ||
    ambassador._count.campusPayments > 0 ||
    ambassador._count.collectiveInvoices > 0;

  const preserveAccount =
    hasParticipantHistory || hasAmbassadorHistory;

  // Inspect CampusPayment, CollectiveInvoice and all other relations
  // before deleting the Ambassador. Do not delete financial history.
  // If a required relation prevents safe deletion, throw an actionable error.

  if (preserveAccount) {
    await prisma.$transaction(async (tx) => {
      // Team.ambassadorId and Registration.ambassadorId are optional
      // in the inspected schema. Detach these references while preserving
      // the corresponding teams and registrations.
      await tx.team.updateMany({
        where: { ambassadorId: ambassadorId },
        data: { ambassadorId: null },
      });

      await tx.registration.updateMany({
        where: { ambassadorId: ambassadorId },
        data: { ambassadorId: null },
      });

      // Delete the assignment, not the University or participant.
      // Before executing this deletion, verify that no required
      // CampusPayment or CollectiveInvoice relation blocks it.
      await tx.ambassador.delete({
        where: { id: ambassadorId },
      });

      await tx.user.update({
        where: { id: ambassador.userId },
        data: { role: 'PARTICIPANT' },
      });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: 'DELETE',
          targetTable: 'Ambassador',
          targetId: ambassadorId,
          details: {
            ambassadorCode: ambassador.ambassadorCode,
            userId: ambassador.userId,
            outcome: 'Ambassador status revoked; account and event history preserved.',
          },
        },
      });
    });
  } else {
    // Before deleting the user, inspect all User and Participant
    // foreign-key dependencies in prisma/schema.prisma.
    // Preserve audit/history records; never cascade-delete event data.
    await prisma.$transaction(async (tx) => {
      if (participant) {
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

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: 'DELETE',
          targetTable: 'Ambassador',
          targetId: ambassadorId,
          details: {
            ambassadorCode: ambassador.ambassadorCode,
            userId: ambassador.userId,
            outcome: 'Unregistered ambassador account removed.',
          },
        },
      });

      // Delete only after confirming no remaining foreign-key
      // dependency prevents User deletion.
      await tx.user.delete({
        where: { id: ambassador.userId },
      });
    });

    // Prisma and Supabase Auth cannot participate in the same transaction.
    // Delete the Auth user only after the Prisma transaction succeeds.
    const supabaseAdmin = createSupabaseAdminClient();

    const { error } = await supabaseAdmin.auth.admin.deleteUser(
      ambassador.userId
    );

    if (error) {
      throw new Error(
        'Prisma records were deleted, but Supabase Auth account cleanup failed. Manual cleanup or a retry is required: ' +
          error.message
      );
    }
  }

  revalidatePath('/admin/ambassadors');
  revalidatePath('/admin/ambassador-requests');
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

  if (!requestId || !universityId || !ambassadorCode) {
    return { error: 'Request, university, and Ambassador code are required.' };
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
  const applicantName = request.participant?.fullName ?? request.fullName ?? 'Ambassador User';
  const applicantPhone = request.participant?.phone ?? request.phone ?? null;
  const applicantCnic = request.participant?.cnic ?? request.cnic ?? null;

  if (!applicantEmail) {
    return { error: 'Applicant email is required for approval.' };
  }

  const generatedPassword = generateAmbassadorPassword();
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
        password: generatedPassword,
        email: applicantEmail,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      return {
        error: 'Could not set the Ambassador login credentials. No approval was completed.',
      };
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: { role: 'AMBASSADOR', isActive: true },
    });
  } else {
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: applicantEmail,
        password: generatedPassword,
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
    let participant = await prisma.participant.findUnique({
      where: { userId: targetUserId },
    });

    if (!participant && request.participantId) {
      participant = await prisma.participant.findUnique({
        where: { id: request.participantId },
      });
    }

    if (!participant) {
      participant = await prisma.participant.findUnique({
        where: { email: applicantEmail },
      });
    }

    if (participant) {
      participant = await prisma.participant.update({
        where: { id: participant.id },
        data: {
          userId: targetUserId,
          universityId: participant.universityId ?? universityId,
        },
      });
    } else {
      participant = await prisma.participant.create({
        data: {
          userId: targetUserId,
          fullName: applicantName,
          email: applicantEmail,
          phone: applicantPhone,
          cnic: applicantCnic,
          universityId,
        },
      });
    }

    await prisma.participant.updateMany({
      where: { userId: targetUserId, universityId: null },
      data: { universityId },
    });

    await prisma.$transaction([
      prisma.ambassador.create({
        data: {
          userId: targetUserId,
          universityId,
          ambassadorCode,
        },
      }),

      prisma.ambassadorRequest.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          participantId: participant.id,
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
    }
    return {
      error: `Failed to complete Ambassador database approval: ${dbErr?.message ?? 'Unknown database error'}`,
    };
  }

  revalidatePath('/admin/ambassador-requests');
  revalidatePath('/admin/ambassadors');
  revalidatePath('/ambassador-application');

  return {
    credentials: {
      email: applicantEmail,
      password: generatedPassword,
    },
  };
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





