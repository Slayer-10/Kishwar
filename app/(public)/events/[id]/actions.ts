'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { findOrCreateUniversity } from '@/lib/university';
import { dispatchNotification } from '@/lib/notifications/dispatch';

const EVIDENCE_BUCKET = 'kishwar-registration-evidence';
const MAX_FILE_SIZE = 8 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

import { type PublicRegistrationState } from './types';
export type { PublicRegistrationState };

export type PublicTeamRegistrationState = {
  error?: string;
  success?: string;
};

class PublicRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PublicRegistrationError';
  }
}

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
    throw new PublicRegistrationError(
      'Enter a valid 13-digit CNIC or B-Form number.'
    );
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

function validateFile(
  file: File | null,
  label: string,
  required: boolean
): File | null {
  if (!file) {
    if (required) {
      throw new PublicRegistrationError(`${label} is required.`);
    }
    return null;
  }

  if (!Object.prototype.hasOwnProperty.call(ALLOWED_TYPES, file.type)) {
    throw new PublicRegistrationError(
      `${label} must be a PDF, JPG, PNG, or WEBP file.`
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new PublicRegistrationError(
      `${label} must be 8 MB or smaller.`
    );
  }

  return file;
}

async function ensurePrivateEvidenceBucket() {
  const supabase = createSupabaseAdminClient();

  let { data: bucket, error } =
    await supabase.storage.getBucket(EVIDENCE_BUCKET);

  if (error || !bucket) {
    const created = await supabase.storage.createBucket(EVIDENCE_BUCKET, {
      public: false,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: Object.keys(ALLOWED_TYPES),
    });

    if (created.error) {
      // Handle a possible concurrent bucket creation by re-reading it.
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
    throw new Error(
      'Evidence storage must be private. Refusing to upload documents.'
    );
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
    throw new PublicRegistrationError('Unsupported evidence file type.');
  }

  const path = `public-registration/${eventId}/${randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error('Unable to securely upload evidence.');
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
    // Do not expose storage internals or sensitive paths to the user.
    // A failed cleanup should be investigated through server monitoring.
  }
}

export async function submitPublicIndividualRegistrationAction(
  _previousState: PublicRegistrationState,
  formData: FormData
): Promise<PublicRegistrationState> {
  const uploadedPaths: string[] = [];

  try {
    const eventId = textValue(formData, 'eventId');
    const fullName = textValue(formData, 'fullName');
    const email = normalizeEmail(textValue(formData, 'email'));
    const phone = textValue(formData, 'phone');
    const cnic = textValue(formData, 'cnic');
    const normalizedCnic = validateCnic(cnic);

    const universityId = textValue(formData, 'universityId');
    const otherUniversityName = textValue(formData, 'otherUniversityName');

    const accommodationSelection = textValue(
      formData,
      'accommodationSelection'
    );

    const accommodationGender = textValue(
      formData,
      'accommodationGender'
    );

    if (!eventId || !fullName || !email || !phone) {
      throw new PublicRegistrationError(
        'Name, email, phone, and event are required.'
      );
    }

    if (fullName.length > 120) {
      throw new PublicRegistrationError('Name is too long.');
    }

    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new PublicRegistrationError('Enter a valid email address.');
    }

    if (phone.length > 30) {
      throw new PublicRegistrationError('Enter a valid phone number.');
    }

    if (!universityId && !otherUniversityName) {
      throw new PublicRegistrationError('Select or enter your university.');
    }

    if (otherUniversityName.length > 120) {
      throw new PublicRegistrationError('University name is too long.');
    }

    if (
      accommodationSelection !== 'NONE_OR_ALREADY_ARRANGED' &&
      accommodationSelection !== 'THREE_DAY_STAY_WITH_FOOD'
    ) {
      throw new PublicRegistrationError(
        'Select a valid accommodation option.'
      );
    }

    if (
      accommodationSelection === 'THREE_DAY_STAY_WITH_FOOD' &&
      !accommodationGender
    ) {
      throw new PublicRegistrationError(
        'Select the required accommodation category.'
      );
    }

    const studentDocument = validateFile(
      getUploadedFile(formData, 'studentDocument'),
      'Student verification document',
      true
    )!;

    const paymentProof = validateFile(
      getUploadedFile(formData, 'paymentProof'),
      'Payment screenshot',
      false
    );

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        status: true,
        deadline: true,
        registrationType: true,
        seatCapacity: true,
      },
    });

    if (!event) {
      throw new PublicRegistrationError('Event not found.');
    }

    if (event.status !== 'OPEN') {
      throw new PublicRegistrationError(
        'This event is not currently accepting registrations.'
      );
    }

    if (event.deadline < new Date()) {
      throw new PublicRegistrationError(
        'The registration deadline has passed.'
      );
    }

    if (event.registrationType === 'TEAM') {
      throw new PublicRegistrationError(
        'This event requires team registration. Please use the team registration process.'
      );
    }

    if (event.seatCapacity !== null) {
      const reservedSeats = await prisma.registration.count({
        where: {
          eventId,
          seatReserved: true,
          reviewStatus: 'APPROVED',
        },
      });

      if (reservedSeats >= event.seatCapacity) {
        throw new PublicRegistrationError(
          'All seats for this event have already been reserved.'
        );
      }
    }

    const university = otherUniversityName
      ? await findOrCreateUniversity(otherUniversityName)
      : await prisma.university.findUnique({
          where: { id: universityId },
          select: { id: true, name: true },
        });

    if (!university) {
      throw new PublicRegistrationError(
        'The selected university could not be found.'
      );
    }

    const initialAmbassador = await prisma.ambassador.findFirst({
      where: {
        universityId: university.id,
        user: { isActive: true },
      },
      select: { id: true },
    });

    if (!initialAmbassador && !paymentProof) {
      throw new PublicRegistrationError(
        'Your university does not currently have an active Ambassador. Upload your payment screenshot to submit your registration for Admin review.'
      );
    }

    // Do not upload until all basic validation and eligibility checks pass.
    const supabase = await ensurePrivateEvidenceBucket();

    const studentDocumentPath = await uploadEvidence(
      supabase,
      eventId,
      studentDocument,
      uploadedPaths
    );

    let paymentProofPath: string | null = null;

    if (paymentProof) {
      paymentProofPath = await uploadEvidence(
        supabase,
        eventId,
        paymentProof,
        uploadedPaths
      );
    }

    await prisma.$transaction(async (tx) => {
      // Recheck the event inside the transaction while holding per-event lock.
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtextextended(${eventId}, 0))
      `;

      const currentEvent = await tx.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          status: true,
          deadline: true,
          registrationType: true,
          seatCapacity: true,
        },
      });

      if (
        !currentEvent ||
        currentEvent.status !== 'OPEN' ||
        currentEvent.deadline < new Date() ||
        currentEvent.registrationType === 'TEAM'
      ) {
        throw new PublicRegistrationError(
          'Registration is no longer available for this event.'
        );
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
          throw new PublicRegistrationError(
            'All seats for this event have already been reserved.'
          );
        }
      }

      const existingRegistration = await tx.registration.findFirst({
        where: {
          eventId,
          reviewStatus: { not: 'REJECTED' },
          OR: [
            {
              participant: {
                is: {
                  OR: [
                    { normalizedCnic },
                    { email },
                  ],
                },
              },
            },
            {
              team: {
                is: {
                  members: {
                    some: {
                      participant: {
                        is: {
                          OR: [
                            { normalizedCnic },
                            { email },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        select: { id: true },
      });

      if (existingRegistration) {
        throw new PublicRegistrationError(
          'A registration with this CNIC/B-Form or email is already submitted for this event.'
        );
      }

      let participant = await tx.participant.findUnique({
        where: { email },
      });

      if (participant) {
        const storedNormalizedCnic =
          participant.normalizedCnic ||
          (participant.cnic
            ? normalizeCnic(participant.cnic)
            : '');

        if (
          storedNormalizedCnic &&
          storedNormalizedCnic !== normalizedCnic
        ) {
          throw new PublicRegistrationError(
            'This email is already associated with a different CNIC/B-Form.'
          );
        }

        participant = await tx.participant.update({
          where: { id: participant.id },
          data: {
            ...(participant.normalizedCnic
              ? {}
              : { normalizedCnic }),
            ...(participant.cnic ? {} : { cnic }),
            ...(participant.universityId
              ? {}
              : { universityId: university.id }),
            ...(participant.phone ? {} : { phone }),
          },
        });
      } else {
        participant = await tx.participant.create({
          data: {
            fullName,
            email,
            phone,
            cnic,
            normalizedCnic,
            universityId: university.id,
          },
        });
      }

      const activeAmbassador = await tx.ambassador.findFirst({
        where: {
          universityId: university.id,
          user: { isActive: true },
        },
        select: { id: true },
      });

      if (!activeAmbassador && !paymentProofPath) {
        throw new PublicRegistrationError(
          'An active Ambassador is unavailable. A payment screenshot is required for Admin review.'
        );
      }

      const registration = await tx.registration.create({
        data: {
          eventId,
          participantId: participant.id,
          ambassadorId: activeAmbassador?.id ?? null,
          status: 'PENDING',
          reviewStatus: activeAmbassador
            ? 'PENDING_AMBASSADOR'
            : 'PENDING_ADMIN',
          source: 'PUBLIC',
          seatReserved: false,
          accommodationSelection,
          accommodationGender:
            accommodationSelection === 'THREE_DAY_STAY_WITH_FOOD'
              ? accommodationGender
              : null,
          accommodationFee: null,
        },
        select: { id: true },
      });

      await tx.registrationEvidence.createMany({
        data: [
          {
            registrationId: registration.id,
            participantId: participant.id,
            type: 'STUDENT_DOCUMENT',
            reviewStatus: 'PENDING',
            storagePath: studentDocumentPath,
            originalFileName: studentDocument.name.slice(0, 180),
            contentType: studentDocument.type,
            byteSize: BigInt(studentDocument.size),
          },
          ...(paymentProof && paymentProofPath
            ? [
                {
                  registrationId: registration.id,
                  participantId: participant.id,
                  type: 'PAYMENT_PROOF' as const,
                  reviewStatus: 'PENDING' as const,
                  storagePath: paymentProofPath,
                  originalFileName: paymentProof.name.slice(0, 180),
                  contentType: paymentProof.type,
                  byteSize: BigInt(paymentProof.size),
                },
              ]
            : []),
        ],
      });
    });

    try {
      revalidatePath(`/events/${eventId}`);
      revalidatePath('/admin');
      revalidatePath('/ambassador');
    } catch {
      // Revalidation safe fallback outside Next request context
    }

    // Trigger notification after database transaction succeeds
    try {
      await dispatchNotification({
        event: 'registration_submitted',
        recipientName: fullName,
        recipientEmail: email,
        recipientPhone: phone,
        subject: `Registration Submitted - ${event.name}`,
        message: `Dear ${fullName}, your registration for ${event.name} has been submitted successfully and is currently under review.`,
        idempotencyKey: `sub_${email}_${eventId}`,
      });
    } catch {
      // Notification dispatch failure should not interrupt completed registration
    }

    return {
      success: initialAmbassador
        ? 'Your registration has been submitted for Ambassador review. Your seat is not reserved yet.'
        : 'Your registration and payment evidence have been submitted for Admin review. Your seat is not reserved yet.',
    };
  } catch (error) {
    await removeUploadedEvidence(uploadedPaths);

    if (error instanceof PublicRegistrationError) {
      return { error: error.message };
    }

    // Do not expose Prisma errors, private storage paths, or participant data.
    console.error(
      '[public-registration] Unexpected submission error:',
      error instanceof Error ? error.message : 'UnknownError'
    );

    return {
      error:
        'We could not submit your registration. Please review your details and try again.',
    };
  }
}

// ─── Public Team Registration ────────────────────────────────────────────────

export async function submitPublicTeamRegistrationAction(
  _previousState: PublicTeamRegistrationState,
  formData: FormData
): Promise<PublicTeamRegistrationState> {
  const uploadedPaths: string[] = [];

  try {
    const eventId = textValue(formData, 'eventId');
    const teamName = textValue(formData, 'teamName');
    const accommodationSelection = textValue(formData, 'accommodationSelection') || 'NONE_OR_ALREADY_ARRANGED';
    const accommodationGender = textValue(formData, 'accommodationGender') || null;

    if (!eventId) throw new PublicRegistrationError('Event is required.');
    if (!teamName || teamName.length < 2) throw new PublicRegistrationError('Team name must be at least 2 characters.');
    if (teamName.length > 120) throw new PublicRegistrationError('Team name is too long.');

    if (
      accommodationSelection !== 'NONE_OR_ALREADY_ARRANGED' &&
      accommodationSelection !== 'THREE_DAY_STAY_WITH_FOOD'
    ) {
      throw new PublicRegistrationError('Select a valid accommodation option.');
    }

    if (accommodationSelection === 'THREE_DAY_STAY_WITH_FOOD' && !accommodationGender) {
      throw new PublicRegistrationError('Select the required accommodation category.');
    }

    // ── Captain fields ─────────────────────────────────────────────────────
    const captainName  = textValue(formData, 'captainName');
    const captainEmail = normalizeEmail(textValue(formData, 'captainEmail'));
    const captainPhone = textValue(formData, 'captainPhone');
    const captainCnic  = textValue(formData, 'captainCnic');

    if (!captainName || captainName.length < 2) throw new PublicRegistrationError('Captain full name is required.');
    if (captainName.length > 120) throw new PublicRegistrationError('Captain name is too long.');
    if (!captainEmail || captainEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(captainEmail)) {
      throw new PublicRegistrationError('Enter a valid captain email address.');
    }
    if (!captainPhone || captainPhone.length > 30) throw new PublicRegistrationError('Enter a valid captain phone number.');

    const captainNormalizedCnic = validateCnic(captainCnic);

    const captainUniversityId = textValue(formData, 'captainUniversityId');
    if (!captainUniversityId) throw new PublicRegistrationError('Select the captain\'s university.');

    const captainStudentDoc = validateFile(
      getUploadedFile(formData, 'captainStudentDocument'),
      'Captain student verification document',
      true
    )!;

    // ── Member fields ───────────────────────────────────────────────────────
    const memberCount = parseInt(textValue(formData, 'memberCount') || '0', 10);

    if (isNaN(memberCount) || memberCount < 0) {
      throw new PublicRegistrationError('Invalid member count.');
    }

    type RawMember = {
      fullName: string;
      email: string;
      phone: string;
      universityId: string;
      cnic: string;
      normalizedCnic: string;
      file: File;
    };

    const rawMembers: RawMember[] = [];

    for (let i = 0; i < memberCount; i++) {
      const mName = textValue(formData, `memberName_${i}`);
      const mEmail = normalizeEmail(textValue(formData, `memberEmail_${i}`));
      const mPhone = textValue(formData, `memberPhone_${i}`);
      const mCnic = textValue(formData, `memberCnic_${i}`);
      const mUniversityId = textValue(formData, `memberUniversityId_${i}`);

      if (!mName || mName.length < 2) throw new PublicRegistrationError(`Member ${i + 1} full name is required.`);
      if (!mEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mEmail)) throw new PublicRegistrationError(`Enter a valid email for member ${i + 1}.`);
      if (!mPhone) throw new PublicRegistrationError(`Phone number is required for member ${i + 1}.`);
      if (!mUniversityId) throw new PublicRegistrationError(`Select the university for member ${i + 1}.`);

      const mNormCnic = validateCnic(mCnic);

      const mFile = validateFile(
        getUploadedFile(formData, `memberStudentDocument_${i}`),
        `Member ${i + 1} student verification document`,
        true
      )!;

      rawMembers.push({
        fullName: mName,
        email: mEmail,
        phone: mPhone,
        universityId: mUniversityId,
        cnic: mCnic,
        normalizedCnic: mNormCnic,
        file: mFile,
      });
    }

    // ── Pre-validate team size against event configuration ──────────────────
    // (We'll re-validate inside the transaction; this gives an early exit.)
    const totalTeamSize = 1 + rawMembers.length; // captain + members

    // ── Duplicate email / CNIC check (pre-DB) ──────────────────────────────
    const allEmails = [captainEmail, ...rawMembers.map((m) => m.email)];
    const allNormCnics = [captainNormalizedCnic, ...rawMembers.map((m) => m.normalizedCnic)];

    if (new Set(allEmails).size !== allEmails.length) {
      throw new PublicRegistrationError('Each team member must have a unique email address.');
    }
    if (new Set(allNormCnics).size !== allNormCnics.length) {
      throw new PublicRegistrationError('Each team member must have a unique CNIC/B-Form number.');
    }

    // ── Basic event validation (before uploads) ─────────────────────────────
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        status: true,
        deadline: true,
        registrationType: true,
        seatCapacity: true,
        minTeamSize: true,
        maxTeamSize: true,
      },
    });

    if (!event) throw new PublicRegistrationError('Event not found.');
    if (event.status !== 'OPEN') {
      throw new PublicRegistrationError('This event is not currently accepting registrations.');
    }
    if (event.deadline < new Date()) {
      throw new PublicRegistrationError('The registration deadline has passed.');
    }
    if (event.registrationType === 'INDIVIDUAL') {
      throw new PublicRegistrationError('This event only accepts individual registration.');
    }

    // Enforce team-size limits from the event record.
    const minSize = event.minTeamSize ?? 2;
    const maxSize = event.maxTeamSize ?? minSize;

    if (totalTeamSize < minSize) {
      throw new PublicRegistrationError(
        `This event requires at least ${minSize} team members (you submitted ${totalTeamSize}).`
      );
    }
    if (totalTeamSize > maxSize) {
      throw new PublicRegistrationError(
        `This event allows at most ${maxSize} team members (you submitted ${totalTeamSize}).`
      );
    }

    // ── Validate captain's university ───────────────────────────────────────
    const captainUniversity = await prisma.university.findUnique({
      where: { id: captainUniversityId },
      select: { id: true, name: true },
    });
    if (!captainUniversity) {
      throw new PublicRegistrationError('The selected university could not be found.');
    }

    // ── Look up Ambassador from captain's university (server-side only) ─────
    const initialAmbassador = await prisma.ambassador.findFirst({
      where: {
        universityId: captainUniversity.id,
        user: { isActive: true },
      },
      select: { id: true },
    });

    // ── Payment proof ────────────────────────────────────────────────────────
    const paymentProof = validateFile(
      getUploadedFile(formData, 'paymentProof'),
      'Payment screenshot',
      false
    );

    if (!initialAmbassador && !paymentProof) {
      throw new PublicRegistrationError(
        'Your university does not currently have an active Ambassador. Upload your payment screenshot to submit your registration for Admin review.'
      );
    }

    // ── Validate member universities ─────────────────────────────────────────
    for (let i = 0; i < rawMembers.length; i++) {
      const exists = await prisma.university.findUnique({
        where: { id: rawMembers[i].universityId },
        select: { id: true },
      });
      if (!exists) {
        throw new PublicRegistrationError(`University for member ${i + 1} could not be found.`);
      }
    }

    // ── Upload evidence files (after all validation passes) ─────────────────
    const supabase = await ensurePrivateEvidenceBucket();

    const captainDocPath = await uploadEvidence(supabase, eventId, captainStudentDoc, uploadedPaths);

    const memberDocPaths: string[] = [];
    for (const member of rawMembers) {
      const path = await uploadEvidence(supabase, eventId, member.file, uploadedPaths);
      memberDocPaths.push(path);
    }

    let paymentProofPath: string | null = null;
    if (paymentProof) {
      paymentProofPath = await uploadEvidence(supabase, eventId, paymentProof, uploadedPaths);
    }

    // ── Transaction ──────────────────────────────────────────────────────────
    let registrationId: string | null = null;

    await prisma.$transaction(async (tx) => {
      // Advisory lock prevents concurrent registrations from racing on capacity.
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtextextended(${eventId}, 0))
      `;

      // Re-validate event state inside the lock.
      const currentEvent = await tx.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          status: true,
          deadline: true,
          registrationType: true,
          seatCapacity: true,
          minTeamSize: true,
          maxTeamSize: true,
        },
      });

      if (
        !currentEvent ||
        currentEvent.status !== 'OPEN' ||
        currentEvent.deadline < new Date() ||
        currentEvent.registrationType === 'INDIVIDUAL'
      ) {
        throw new PublicRegistrationError('Registration is no longer available for this event.');
      }

      const lockedMin = currentEvent.minTeamSize ?? 2;
      const lockedMax = currentEvent.maxTeamSize ?? lockedMin;

      if (totalTeamSize < lockedMin || totalTeamSize > lockedMax) {
        throw new PublicRegistrationError(
          `Team size ${totalTeamSize} does not meet the event requirement of ${lockedMin}–${lockedMax} members.`
        );
      }

      // Capacity check: count per-participant (seatCapacity is participant-based).
      if (currentEvent.seatCapacity !== null) {
        const reservedSeats = await tx.registration.count({
          where: {
            eventId,
            seatReserved: true,
            reviewStatus: 'APPROVED',
          },
        });

        if (reservedSeats + totalTeamSize > currentEvent.seatCapacity) {
          throw new PublicRegistrationError(
            `Not enough seats remaining for this team. ${currentEvent.seatCapacity - reservedSeats} seat(s) remain.`
          );
        }
      }

      // Duplicate-registration check for every member.
      const conflictingRegistration = await tx.registration.findFirst({
        where: {
          eventId,
          reviewStatus: { not: 'REJECTED' },
          OR: [
            {
              participant: {
                is: {
                  OR: [
                    { email: { in: allEmails } },
                    { normalizedCnic: { in: allNormCnics } },
                  ],
                },
              },
            },
            {
              team: {
                is: {
                  members: {
                    some: {
                      participant: {
                        is: {
                          OR: [
                            { email: { in: allEmails } },
                            { normalizedCnic: { in: allNormCnics } },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        select: { id: true },
      });

      if (conflictingRegistration) {
        throw new PublicRegistrationError(
          'One or more team members are already registered for this event.'
        );
      }

      // Re-check the active Ambassador under the lock.
      const activeAmbassador = await tx.ambassador.findFirst({
        where: {
          universityId: captainUniversity.id,
          user: { isActive: true },
        },
        select: { id: true },
      });

      if (!activeAmbassador && !paymentProofPath) {
        throw new PublicRegistrationError(
          'An active Ambassador is unavailable. A payment screenshot is required for Admin review.'
        );
      }

      // ── Find-or-create captain participant ──────────────────────────────
      let captainParticipant = await tx.participant.findUnique({
        where: { email: captainEmail },
      });

      if (captainParticipant) {
        const stored = captainParticipant.normalizedCnic ??
          (captainParticipant.cnic ? captainParticipant.cnic.replace(/\D/g, '') : '');
        if (stored && stored !== captainNormalizedCnic) {
          throw new PublicRegistrationError(
            'The captain\'s email is already associated with a different CNIC/B-Form.'
          );
        }
        captainParticipant = await tx.participant.update({
          where: { id: captainParticipant.id },
          data: {
            ...(captainParticipant.normalizedCnic ? {} : { normalizedCnic: captainNormalizedCnic }),
            ...(captainParticipant.cnic ? {} : { cnic: captainCnic }),
            ...(captainParticipant.universityId ? {} : { universityId: captainUniversityId }),
            ...(captainParticipant.phone ? {} : { phone: captainPhone }),
          },
        });
      } else {
        captainParticipant = await tx.participant.create({
          data: {
            fullName: captainName,
            email: captainEmail,
            phone: captainPhone,
            cnic: captainCnic,
            normalizedCnic: captainNormalizedCnic,
            universityId: captainUniversityId,
          },
        });
      }

      // ── Find-or-create member participants ──────────────────────────────
      const memberParticipants: Array<{ id: string }> = [];

      for (let i = 0; i < rawMembers.length; i++) {
        const m = rawMembers[i];
        let memPart = await tx.participant.findUnique({ where: { email: m.email } });

        if (memPart) {
          const stored = memPart.normalizedCnic ??
            (memPart.cnic ? memPart.cnic.replace(/\D/g, '') : '');
          if (stored && stored !== m.normalizedCnic) {
            throw new PublicRegistrationError(
              `Member ${i + 1}'s email is already associated with a different CNIC/B-Form.`
            );
          }
          memPart = await tx.participant.update({
            where: { id: memPart.id },
            data: {
              ...(memPart.normalizedCnic ? {} : { normalizedCnic: m.normalizedCnic }),
              ...(memPart.cnic ? {} : { cnic: m.cnic }),
              ...(memPart.universityId ? {} : { universityId: m.universityId }),
              ...(memPart.phone ? {} : { phone: m.phone }),
            },
          });
        } else {
          memPart = await tx.participant.create({
            data: {
              fullName: m.fullName,
              email: m.email,
              phone: m.phone,
              cnic: m.cnic,
              normalizedCnic: m.normalizedCnic,
              universityId: m.universityId,
            },
          });
        }
        memberParticipants.push({ id: memPart.id });
      }

      const allParticipantIds = [captainParticipant.id, ...memberParticipants.map((p) => p.id)];

      // ── Create team ─────────────────────────────────────────────────────
      const team = await tx.team.create({
        data: {
          name: teamName,
          captainId: captainParticipant.id,
          eventId,
          universityId: captainUniversityId,
          ambassadorId: activeAmbassador?.id ?? null,
          members: {
            create: allParticipantIds.map((participantId) => ({ participantId })),
          },
        },
      });

      // ── Create registration ─────────────────────────────────────────────
      const registration = await tx.registration.create({
        data: {
          eventId,
          teamId: team.id,
          ambassadorId: activeAmbassador?.id ?? null,
          status: 'PENDING',
          reviewStatus: activeAmbassador ? 'PENDING_AMBASSADOR' : 'PENDING_ADMIN',
          source: 'PUBLIC',
          seatReserved: false,
          accommodationSelection: accommodationSelection as 'NONE_OR_ALREADY_ARRANGED' | 'THREE_DAY_STAY_WITH_FOOD',
          accommodationGender:
            accommodationSelection === 'THREE_DAY_STAY_WITH_FOOD' ? accommodationGender : null,
          accommodationFee: null,
        },
        select: { id: true },
      });

      registrationId = registration.id;

      // ── Create evidence records ─────────────────────────────────────────
      // One STUDENT_DOCUMENT per participant, one PAYMENT_PROOF if required.
      const evidenceData: Array<{
        registrationId: string;
        participantId: string;
        type: 'STUDENT_DOCUMENT' | 'PAYMENT_PROOF';
        reviewStatus: 'PENDING';
        storagePath: string;
        originalFileName: string;
        contentType: string;
        byteSize: bigint;
      }> = [
        {
          registrationId: registration.id,
          participantId: captainParticipant.id,
          type: 'STUDENT_DOCUMENT',
          reviewStatus: 'PENDING',
          storagePath: captainDocPath,
          originalFileName: captainStudentDoc.name.slice(0, 180),
          contentType: captainStudentDoc.type,
          byteSize: BigInt(captainStudentDoc.size),
        },
        ...rawMembers.map((m, i) => ({
          registrationId: registration.id,
          participantId: memberParticipants[i].id,
          type: 'STUDENT_DOCUMENT' as const,
          reviewStatus: 'PENDING' as const,
          storagePath: memberDocPaths[i],
          originalFileName: m.file.name.slice(0, 180),
          contentType: m.file.type,
          byteSize: BigInt(m.file.size),
        })),
        ...(paymentProof && paymentProofPath
          ? [
              {
                registrationId: registration.id,
                participantId: captainParticipant.id,
                type: 'PAYMENT_PROOF' as const,
                reviewStatus: 'PENDING' as const,
                storagePath: paymentProofPath,
                originalFileName: paymentProof.name.slice(0, 180),
                contentType: paymentProof.type,
                byteSize: BigInt(paymentProof.size),
              },
            ]
          : []),
      ];

      await tx.registrationEvidence.createMany({ data: evidenceData });
    });

    try {
      revalidatePath(`/events/${eventId}`);
      revalidatePath('/admin');
      revalidatePath('/ambassador');
    } catch {
      // Revalidation safe fallback outside Next request context
    }

    // Notify the captain after a successful database commit.
    try {
      await dispatchNotification({
        event: 'registration_submitted',
        recipientName: captainName,
        recipientEmail: captainEmail,
        recipientPhone: captainPhone,
        subject: `Team Registration Submitted – ${event.name}`,
        message: `Dear ${captainName}, your team "${teamName}" registration for ${event.name} has been submitted and is currently under review.`,
        idempotencyKey: `team_sub_${captainEmail}_${eventId}`,
      });
    } catch {
      // Notification failure must not undo a completed registration.
    }

    return {
      success: initialAmbassador
        ? `Team "${teamName}" has been submitted for Ambassador review. Your seat is not reserved yet.`
        : `Team "${teamName}" and payment evidence have been submitted for Admin review. Your seat is not reserved yet.`,
    };
  } catch (error) {
    await removeUploadedEvidence(uploadedPaths);

    if (error instanceof PublicRegistrationError) {
      return { error: error.message };
    }

    console.error(
      '[public-team-registration] Unexpected submission error:',
      error instanceof Error ? error.message : 'UnknownError'
    );

    return {
      error: 'We could not submit your team registration. Please review your details and try again.',
    };
  }
}
