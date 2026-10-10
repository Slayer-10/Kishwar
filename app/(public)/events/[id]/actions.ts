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

export type PublicRegistrationState = {
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
      await tx.$queryRaw`
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
                  normalizedCnic,
                },
              },
            },
            {
              team: {
                is: {
                  members: {
                    some: {
                      participant: {
                        is: { normalizedCnic },
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
          'This CNIC/B-Form is already registered for this event.'
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

    revalidatePath(`/events/${eventId}`);
    revalidatePath('/admin');
    revalidatePath('/ambassador');

    // Trigger notification after database transaction succeeds
    await dispatchNotification({
      event: 'registration_submitted',
      recipientName: fullName,
      recipientEmail: email,
      recipientPhone: phone,
      subject: `Registration Submitted - ${event.name}`,
      message: `Dear ${fullName}, your registration for ${event.name} has been submitted successfully and is currently under review.`,
      idempotencyKey: `sub_${email}_${eventId}`,
    });

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
      '[public-registration] Submission failed',
      error instanceof Error ? error.name : 'UnknownError'
    );

    return {
      error:
        'We could not submit your registration. Please review your details and try again.',
    };
  }
}
