'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { ambassadorInvoiceScope, PAYABLE_INVOICE_FILTER } from '@/lib/ambassador-scope';

const EVIDENCE_BUCKET = 'kishwar-registration-evidence';
const MAX_FILE_SIZE = 8 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export type AmbassadorRegistrationState = {
  error?: string;
  success?: string;
};

function textValue(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeCnic(value: string): string {
  return value.replace(/\D/g, '');
}

function validateCnic(value: string): string {
  const normalized = normalizeCnic(value);
  if (!/^\d{13}$/.test(normalized)) {
    throw new Error('Enter a valid 13-digit CNIC or B-Form number.');
  }
  return normalized;
}

function getUploadedFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }
  return value;
}

function validateFile(file: File | null, label: string): File {
  if (!file || !(file instanceof File) || file.size === 0) {
    throw new Error(`${label} (Student ID photo/document) is required.`);
  }

  if (!Object.prototype.hasOwnProperty.call(ALLOWED_TYPES, file.type)) {
    throw new Error(`${label} must be a PDF, JPG, PNG, or WEBP file.`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`${label} must be 8 MB or smaller.`);
  }

  return file;
}

async function ensurePrivateEvidenceBucket() {
  const supabase = createSupabaseAdminClient();

  let { data: bucket, error } = await supabase.storage.getBucket(EVIDENCE_BUCKET);

  if (error || !bucket) {
    const created = await supabase.storage.createBucket(EVIDENCE_BUCKET, {
      public: false,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: Object.keys(ALLOWED_TYPES),
    });

    if (created.error) {
      const retry = await supabase.storage.getBucket(EVIDENCE_BUCKET);

      if (retry.error || !retry.data) {
        throw new Error('Private evidence storage is unavailable.');
      }

      bucket = retry.data;
    } else {
      const createdRead = await supabase.storage.getBucket(EVIDENCE_BUCKET);
      bucket = createdRead.data;
    }
  }

  if (!bucket || bucket.public) {
    throw new Error('Evidence storage must be private.');
  }

  return supabase;
}

async function uploadEvidence(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  eventId: string,
  file: File,
  uploadedPaths: string[]
): Promise<string> {
  const extension = ALLOWED_TYPES[file.type];

  if (!extension) {
    throw new Error('Unsupported evidence file type.');
  }

  const path = `ambassador-registration/${eventId}/${randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error('Unable to securely upload student ID evidence.');
  }

  uploadedPaths.push(path);
  return path;
}

async function removeUploadedEvidence(paths: string[]) {
  if (paths.length === 0) return;

  try {
    const supabase = createSupabaseAdminClient();
    await supabase.storage.from(EVIDENCE_BUCKET).remove(paths);
  } catch {
    // Internal cleanup error ignored for client feedback
  }
}

async function requireAmbassador() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'AMBASSADOR' || !user.ambassador) {
    redirect('/login');
  }

  const ambassador = user.ambassador;

  if (!user.participant) {
    const participant = await prisma.participant.create({
      data: {
        userId: user.id,
        fullName: user.email.split('@')[0],
        email: user.email,
      },
    });
    return { ...user, participant, ambassador };
  }

  return {
    ...user,
    participant: user.participant,
    ambassador,
  };
}

export async function registerParticipantAction(
  _prevState: any,
  formData: FormData
): Promise<AmbassadorRegistrationState> {
  const uploadedPaths: string[] = [];

  try {
    const user = await requireAmbassador();
    const ambassador = user.ambassador;

    const eventId = textValue(formData, 'eventId');
    const fullName = textValue(formData, 'fullName');
    const participantEmail = normalizeEmail(textValue(formData, 'participantEmail'));
    const participantPhone = textValue(formData, 'participantPhone');
    const participantCnic = textValue(formData, 'participantCnic');
    const accommodationSelection = textValue(formData, 'accommodationSelection') || 'NONE_OR_ALREADY_ARRANGED';
    const accommodationGender = textValue(formData, 'accommodationGender') || null;

    if (!eventId || !participantEmail || !participantCnic) {
      throw new Error('Event, participant email, and CNIC are required.');
    }

    const normalizedCnic = validateCnic(participantCnic);

    const studentDocumentFile = validateFile(
      getUploadedFile(formData, 'studentDocument'),
      'Participant Student ID'
    );

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new Error('Event not found.');
    }

    if (event.status !== 'OPEN') {
      throw new Error('This event is not open for registration.');
    }

    if (event.deadline < new Date()) {
      throw new Error('The registration deadline has passed.');
    }

    if (event.registrationType === 'TEAM') {
      throw new Error('This event only accepts team registration.');
    }

    // Find or create participant
    let participant = await prisma.participant.findUnique({
      where: { email: participantEmail },
    });

    if (participant) {
      const storedCnic = participant.normalizedCnic || (participant.cnic ? normalizeCnic(participant.cnic) : '');
      if (storedCnic && storedCnic !== normalizedCnic) {
        throw new Error("The entered CNIC does not match this participant's existing account.");
      }

      participant = await prisma.participant.update({
        where: { id: participant.id },
        data: {
          fullName: fullName || participant.fullName,
          phone: participantPhone || participant.phone,
          cnic: participantCnic,
          normalizedCnic,
          universityId: ambassador.universityId,
        },
      });
    } else {
      participant = await prisma.participant.create({
        data: {
          fullName: fullName || participantEmail.split('@')[0],
          email: participantEmail,
          phone: participantPhone || null,
          cnic: participantCnic,
          normalizedCnic,
          universityId: ambassador.universityId,
        },
      });
    }

    // Upload Student ID evidence
    const supabase = await ensurePrivateEvidenceBucket();
    const studentDocPath = await uploadEvidence(
      supabase,
      eventId,
      studentDocumentFile,
      uploadedPaths
    );

    // Transaction with advisory lock
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtextextended(${eventId}, 0))
      `;

      const currentEvent = await tx.event.findUnique({
        where: { id: eventId },
        select: { id: true, status: true, deadline: true, seatCapacity: true },
      });

      if (!currentEvent || currentEvent.status !== 'OPEN' || currentEvent.deadline < new Date()) {
        throw new Error('Registration is no longer available for this event.');
      }

      if (currentEvent.seatCapacity !== null) {
        const reservedSeats = await tx.registration.count({
          where: {
            eventId,
            seatReserved: true,
            reviewStatus: 'APPROVED',
          },
        });

        if (reservedSeats >= currentEvent.seatCapacity) {
          throw new Error('All seats for this event have already been reserved.');
        }
      }

      const existingRegistration = await tx.registration.findFirst({
        where: {
          eventId,
          reviewStatus: { not: 'REJECTED' },
          OR: [
            { participantId: participant.id },
            { participant: { is: { normalizedCnic } } },
          ],
        },
      });

      if (existingRegistration) {
        throw new Error('This participant is already registered for this event.');
      }

      const registration = await tx.registration.create({
        data: {
          eventId,
          participantId: participant.id,
          ambassadorId: ambassador.id,
          source: 'AMBASSADOR',
          reviewStatus: 'APPROVED',
          seatReserved: true,
          status: 'PENDING',
          accommodationSelection: accommodationSelection as any,
          accommodationGender,
          ambassadorApprovedAt: new Date(),
        },
      });

      await tx.registrationEvidence.create({
        data: {
          registrationId: registration.id,
          participantId: participant.id,
          type: 'STUDENT_DOCUMENT',
          reviewStatus: 'VERIFIED',
          storagePath: studentDocPath,
          originalFileName: studentDocumentFile.name.slice(0, 180),
          contentType: studentDocumentFile.type,
          byteSize: BigInt(studentDocumentFile.size),
          uploadedByUserId: user.id,
        },
      });
    });

    revalidatePath('/ambassador');
    revalidatePath('/ambassador/participants');

    return {
      success: `Participant ${participant.fullName} registered successfully and seat reserved.`,
    };
  } catch (err: any) {
    await removeUploadedEvidence(uploadedPaths);
    return { error: err?.message || 'Failed to register participant.' };
  }
}

export async function registerTeamAction(
  _prevState: any,
  formData: FormData
): Promise<AmbassadorRegistrationState> {
  const uploadedPaths: string[] = [];

  try {
    const user = await requireAmbassador();
    const ambassador = user.ambassador;

    const eventId = textValue(formData, 'eventId');
    const teamName = textValue(formData, 'teamName');

    const captainName = textValue(formData, 'captainName');
    const captainEmail = normalizeEmail(textValue(formData, 'captainEmail'));
    const captainPhone = textValue(formData, 'captainPhone');
    const captainCnic = textValue(formData, 'captainCnic');

    const accommodationSelection = textValue(formData, 'accommodationSelection') || 'NONE_OR_ALREADY_ARRANGED';
    const accommodationGender = textValue(formData, 'accommodationGender') || null;

    const memberNames = formData.getAll('memberNames').map((v) => String(v).trim());
    const memberEmails = formData.getAll('memberEmails').map((v) => normalizeEmail(String(v)));
    const memberPhones = formData.getAll('memberPhones').map((v) => String(v).trim());
    const memberCnics = formData.getAll('memberCnics').map((v) => String(v).trim());

    if (!eventId || !teamName || !captainEmail || !captainCnic) {
      throw new Error('Event, team name, captain email, and captain CNIC are required.');
    }

    const captainNormalizedCnic = validateCnic(captainCnic);

    const captainStudentDocFile = validateFile(
      getUploadedFile(formData, 'captainStudentDocument'),
      'Captain Student ID'
    );

    // Validate members & their student IDs
    const memberFiles: File[] = [];
    const memberNormalizedCnics: string[] = [];

    for (let i = 0; i < memberEmails.length; i++) {
      if (!memberEmails[i] || !memberCnics[i]) {
        throw new Error(`Member ${i + 1} email and CNIC are required.`);
      }
      const normCnic = validateCnic(memberCnics[i]);
      memberNormalizedCnics.push(normCnic);

      const file = validateFile(
        getUploadedFile(formData, `memberStudentDocument_${i}`),
        `Member ${i + 1} Student ID`
      );
      memberFiles.push(file);
    }

    const allEmails = [captainEmail, ...memberEmails];
    const allCnics = [captainNormalizedCnic, ...memberNormalizedCnics];

    if (new Set(allEmails).size !== allEmails.length) {
      throw new Error('Duplicate emails found within the team.');
    }

    if (new Set(allCnics).size !== allCnics.length) {
      throw new Error('Duplicate CNICs found within the team.');
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new Error('Event not found.');
    }

    if (event.status !== 'OPEN') {
      throw new Error('This event is not open for registration.');
    }

    if (event.deadline < new Date()) {
      throw new Error('The registration deadline has passed.');
    }

    if (event.registrationType === 'INDIVIDUAL') {
      throw new Error('This event only accepts individual registration.');
    }

    const totalTeamSize = allEmails.length;
    if (event.minTeamSize && totalTeamSize < event.minTeamSize) {
      throw new Error(`This event requires at least ${event.minTeamSize} team members.`);
    }

    if (event.maxTeamSize && totalTeamSize > event.maxTeamSize) {
      throw new Error(`This event allows at most ${event.maxTeamSize} team members.`);
    }

    // Find or create participant records for captain and members
    const participantRecords: Array<{ id: string; email: string; file: File }> = [];

    // Captain
    let captainPart = await prisma.participant.findUnique({ where: { email: captainEmail } });
    if (captainPart) {
      captainPart = await prisma.participant.update({
        where: { id: captainPart.id },
        data: {
          fullName: captainName || captainPart.fullName,
          phone: captainPhone || captainPart.phone,
          cnic: captainCnic,
          normalizedCnic: captainNormalizedCnic,
          universityId: ambassador.universityId,
        },
      });
    } else {
      captainPart = await prisma.participant.create({
        data: {
          fullName: captainName || captainEmail.split('@')[0],
          email: captainEmail,
          phone: captainPhone || null,
          cnic: captainCnic,
          normalizedCnic: captainNormalizedCnic,
          universityId: ambassador.universityId,
        },
      });
    }
    participantRecords.push({ id: captainPart.id, email: captainEmail, file: captainStudentDocFile });

    // Members
    for (let i = 0; i < memberEmails.length; i++) {
      const mEmail = memberEmails[i];
      const mName = memberNames[i];
      const mPhone = memberPhones[i];
      const mCnic = memberCnics[i];
      const mNormCnic = memberNormalizedCnics[i];

      let memPart = await prisma.participant.findUnique({ where: { email: mEmail } });
      if (memPart) {
        memPart = await prisma.participant.update({
          where: { id: memPart.id },
          data: {
            fullName: mName || memPart.fullName,
            phone: mPhone || memPart.phone,
            cnic: mCnic,
            normalizedCnic: mNormCnic,
            universityId: ambassador.universityId,
          },
        });
      } else {
        memPart = await prisma.participant.create({
          data: {
            fullName: mName || mEmail.split('@')[0],
            email: mEmail,
            phone: mPhone || null,
            cnic: mCnic,
            normalizedCnic: mNormCnic,
            universityId: ambassador.universityId,
          },
        });
      }
      participantRecords.push({ id: memPart.id, email: mEmail, file: memberFiles[i] });
    }

    // Upload Student IDs
    const supabase = await ensurePrivateEvidenceBucket();
    const uploadedEvidences: Array<{ participantId: string; storagePath: string; file: File }> = [];

    for (const rec of participantRecords) {
      const path = await uploadEvidence(supabase, eventId, rec.file, uploadedPaths);
      uploadedEvidences.push({ participantId: rec.id, storagePath: path, file: rec.file });
    }

    const allParticipantIds = participantRecords.map((r) => r.id);

    // Transaction with lock & capacity check
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtextextended(${eventId}, 0))
      `;

      const currentEvent = await tx.event.findUnique({
        where: { id: eventId },
        select: { id: true, status: true, deadline: true, seatCapacity: true },
      });

      if (!currentEvent || currentEvent.status !== 'OPEN' || currentEvent.deadline < new Date()) {
        throw new Error('Registration is no longer available for this event.');
      }

      if (currentEvent.seatCapacity !== null) {
        const reservedSeats = await tx.registration.count({
          where: {
            eventId,
            seatReserved: true,
            reviewStatus: 'APPROVED',
          },
        });

        if (reservedSeats + totalTeamSize > currentEvent.seatCapacity) {
          throw new Error(
            `Not enough seats remaining. Required ${totalTeamSize} seats, but only ${
              currentEvent.seatCapacity - reservedSeats
            } seats remain.`
          );
        }
      }

      const conflictingRegistration = await tx.registration.findFirst({
        where: {
          eventId,
          reviewStatus: { not: 'REJECTED' },
          OR: [
            { participantId: { in: allParticipantIds } },
            { participant: { is: { normalizedCnic: { in: allCnics } } } },
            { team: { is: { captainId: { in: allParticipantIds } } } },
            { team: { is: { members: { some: { participantId: { in: allParticipantIds } } } } } },
          ],
        },
      });

      if (conflictingRegistration) {
        throw new Error('One or more team members are already registered for this event.');
      }

      const team = await tx.team.create({
        data: {
          name: teamName,
          captainId: captainPart.id,
          eventId,
          universityId: ambassador.universityId,
          ambassadorId: ambassador.id,
          members: {
            create: allParticipantIds.map((participantId) => ({
              participantId,
            })),
          },
        },
      });

      const registration = await tx.registration.create({
        data: {
          eventId,
          teamId: team.id,
          ambassadorId: ambassador.id,
          source: 'AMBASSADOR',
          reviewStatus: 'APPROVED',
          seatReserved: true,
          status: 'PENDING',
          accommodationSelection: accommodationSelection as any,
          accommodationGender,
          ambassadorApprovedAt: new Date(),
        },
      });

      await tx.registrationEvidence.createMany({
        data: uploadedEvidences.map((ev) => ({
          registrationId: registration.id,
          participantId: ev.participantId,
          type: 'STUDENT_DOCUMENT',
          reviewStatus: 'VERIFIED',
          storagePath: ev.storagePath,
          originalFileName: ev.file.name.slice(0, 180),
          contentType: ev.file.type,
          byteSize: BigInt(ev.file.size),
          uploadedByUserId: user.id,
        })),
      });
    });

    revalidatePath('/ambassador');
    revalidatePath('/ambassador/participants');

    return {
      success: `Team "${teamName}" registered successfully with ${totalTeamSize} members.`,
    };
  } catch (err: any) {
    await removeUploadedEvidence(uploadedPaths);
    return { error: err?.message || 'Failed to register team.' };
  }
}

export async function registerSelfAction(
  _prevState: any,
  formData: FormData
): Promise<AmbassadorRegistrationState> {
  const uploadedPaths: string[] = [];

  try {
    const user = await requireAmbassador();
    const ambassador = user.ambassador;
    const participant = user.participant;

    const eventId = textValue(formData, 'eventId');
    const participantCnic = textValue(formData, 'participantCnic');
    const accommodationSelection = textValue(formData, 'accommodationSelection') || 'NONE_OR_ALREADY_ARRANGED';
    const accommodationGender = textValue(formData, 'accommodationGender') || null;

    if (!eventId || !participantCnic) {
      throw new Error('Event ID and CNIC are required.');
    }

    const normalizedCnic = validateCnic(participantCnic);

    const studentDocumentFile = validateFile(
      getUploadedFile(formData, 'studentDocument'),
      'Your Student ID'
    );

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new Error('Event not found.');
    }

    if (event.status !== 'OPEN') {
      throw new Error('This event is not open for registration.');
    }

    if (event.deadline < new Date()) {
      throw new Error('The registration deadline has passed.');
    }

    if (event.registrationType === 'TEAM') {
      throw new Error('This event only accepts team registration.');
    }

    // Update Ambassador participant CNIC
    await prisma.participant.update({
      where: { id: participant.id },
      data: {
        cnic: participantCnic,
        normalizedCnic,
        universityId: ambassador.universityId,
      },
    });

    // Upload Student ID
    const supabase = await ensurePrivateEvidenceBucket();
    const studentDocPath = await uploadEvidence(
      supabase,
      eventId,
      studentDocumentFile,
      uploadedPaths
    );

    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtextextended(${eventId}, 0))
      `;

      const currentEvent = await tx.event.findUnique({
        where: { id: eventId },
        select: { id: true, status: true, deadline: true, seatCapacity: true },
      });

      if (!currentEvent || currentEvent.status !== 'OPEN' || currentEvent.deadline < new Date()) {
        throw new Error('Registration is no longer available for this event.');
      }

      if (currentEvent.seatCapacity !== null) {
        const reservedSeats = await tx.registration.count({
          where: {
            eventId,
            seatReserved: true,
            reviewStatus: 'APPROVED',
          },
        });

        if (reservedSeats >= currentEvent.seatCapacity) {
          throw new Error('All seats for this event have already been reserved.');
        }
      }

      const existingRegistration = await tx.registration.findFirst({
        where: {
          eventId,
          reviewStatus: { not: 'REJECTED' },
          OR: [
            { participantId: participant.id },
            { participant: { is: { normalizedCnic } } },
          ],
        },
      });

      if (existingRegistration) {
        throw new Error('You are already registered for this event.');
      }

      const registration = await tx.registration.create({
        data: {
          eventId,
          participantId: participant.id,
          ambassadorId: ambassador.id,
          source: 'AMBASSADOR',
          reviewStatus: 'APPROVED',
          seatReserved: true,
          status: 'PENDING',
          accommodationSelection: accommodationSelection as any,
          accommodationGender,
          ambassadorApprovedAt: new Date(),
        },
      });

      await tx.registrationEvidence.create({
        data: {
          registrationId: registration.id,
          participantId: participant.id,
          type: 'STUDENT_DOCUMENT',
          reviewStatus: 'VERIFIED',
          storagePath: studentDocPath,
          originalFileName: studentDocumentFile.name.slice(0, 180),
          contentType: studentDocumentFile.type,
          byteSize: BigInt(studentDocumentFile.size),
          uploadedByUserId: user.id,
        },
      });
    });

    revalidatePath('/ambassador');
    revalidatePath('/ambassador/my-registrations');

    return {
      success: 'You have been registered successfully and your seat is reserved.',
    };
  } catch (err: any) {
    await removeUploadedEvidence(uploadedPaths);
    return { error: err?.message || 'Failed to register yourself.' };
  }
}

export async function submitBatchPaymentAction(formData: FormData) {
  const user = await requireAmbassador();

  const fail = (message: string): never =>
    redirect(`/ambassador/payments?error=${encodeURIComponent(message)}`);

  const ambassador = user.ambassador;

  const invoiceIds = Array.from(
    new Set(
      formData
        .getAll('invoiceIds')
        .map((v) => String(v).trim())
        .filter(Boolean)
    )
  );
  const method = String(formData.get('method') ?? '').trim();
  const referenceNumber = String(formData.get('referenceNumber') ?? '').trim();
  const proofUrl = String(formData.get('proofUrl') ?? '').trim() || null;
  const expectedTotal = String(formData.get('expectedTotal') ?? '').trim();

  if (invoiceIds.length === 0) fail('There are no invoices to pay.');
  if (!method) fail('Payment method is required.');
  if (!referenceNumber) fail('Reference number is required.');

  const invoices = await prisma.invoice.findMany({
    where: {
      AND: [
        { id: { in: invoiceIds } },
        ambassadorInvoiceScope(ambassador, user.participant?.id),
        PAYABLE_INVOICE_FILTER,
      ],
    },
  });

  if (invoices.length !== invoiceIds.length) {
    fail('The invoice list changed. Please review the updated list and try again.');
  }

  const total = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  if (total.toFixed(2) !== Number(expectedTotal).toFixed(2)) {
    fail('The total changed. Please review the updated total and try again.');
  }

  const batchId = randomUUID();

  await prisma.payment.createMany({
    data: invoices.map((inv) => ({
      invoiceId: inv.id,
      amount: inv.amount,
      method,
      referenceNumber,
      proofUrl,
      batchId,
    })),
  });

  revalidatePath('/ambassador');
  revalidatePath('/ambassador/payments');
  revalidatePath('/admin/payments');

  redirect('/ambassador/payments');
}

export async function submitCampusPaymentAction(formData: FormData) {
  const user = await requireAmbassador();

  const fail = (message: string): never =>
    redirect(`/ambassador/payments?error=${encodeURIComponent(message)}`);

  const ambassador = user.ambassador;

  const method = String(formData.get('method') ?? '').trim();
  const referenceNumber = String(formData.get('referenceNumber') ?? '').trim();
  const proofUrl = String(formData.get('proofUrl') ?? '').trim() || null;

  if (!method) fail('Payment method is required.');

  const campusScopeWhere = {
    OR: [
      { ambassadorId: ambassador.id },
      { team: { ambassadorId: ambassador.id } },
      { participant: { universityId: ambassador.universityId } },
      { team: { universityId: ambassador.universityId } },
    ],
  };

  const unpaidInvoices = await prisma.invoice.findMany({
    where: {
      status: 'PENDING',
      campusPaymentId: null,
      registration: campusScopeWhere,
    },
  });

  if (unpaidInvoices.length === 0) {
    fail('No unpaid invoices found for your campus.');
  }

  const totalAmount = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

  await prisma.$transaction(async (tx) => {
    const campusPayment = await tx.campusPayment.create({
      data: {
        ambassadorId: ambassador.id,
        totalAmount,
        method,
        referenceNumber: referenceNumber || null,
        proofUrl,
        verificationStatus: 'SUBMITTED',
      },
    });

    await tx.invoice.updateMany({
      where: {
        id: { in: unpaidInvoices.map((inv) => inv.id) },
      },
      data: {
        campusPaymentId: campusPayment.id,
      },
    });
  });

  revalidatePath('/ambassador/payments');
  revalidatePath('/admin/payments');

  redirect('/ambassador/payments');
}
