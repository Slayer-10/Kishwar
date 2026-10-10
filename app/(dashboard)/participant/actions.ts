'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { findOrCreateUniversity } from '@/lib/university';

async function requireParticipant() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (!user.participant) {
    throw new Error('Only participant accounts can perform this action.');
  }

  return user;
}

export async function requestAmbassadorAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'PARTICIPANT' || !user.participant) {
    redirect('/login');
  }

  const existing = await prisma.ambassadorRequest.findFirst({
    where: { participantId: user.participant.id },
    orderBy: { createdAt: 'desc' },
  });

  if (existing?.status === 'PENDING' || existing?.status === 'APPROVED') {
    redirect('/participant/ambassador-application');
  }

  const fullName = String(formData.get('fullName') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const cnic = String(formData.get('cnic') ?? '').trim();
  const gender = String(formData.get('gender') ?? '').trim();
  const universityNameRaw = String(formData.get('universityName') ?? '').trim();
  const occupation = String(formData.get('occupation') ?? '').trim();
  const degree = String(formData.get('degree') ?? '').trim();
  const semesterRaw = String(formData.get('semester') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim() || null;

  if (!fullName || !phone || !cnic || !gender || !occupation || !degree || !semesterRaw) {
    throw new Error('All required personal and academic fields must be filled.');
  }

  const semester = parseInt(semesterRaw, 10);
  if (isNaN(semester) || semester < 1) {
    throw new Error('Semester must be a valid positive number.');
  }

  let universityId: string;
  if (universityNameRaw) {
    universityId = (await findOrCreateUniversity(universityNameRaw)).id;
  } else {
    const me = await prisma.participant.findUnique({
      where: { id: user.participant.id },
      select: { universityId: true },
    });
    if (!me?.universityId) {
      throw new Error('University is required.');
    }
    universityId = me.universityId;
  }

  await prisma.participant.update({
    where: { id: user.participant.id },
    data: { fullName, phone, cnic, universityId },
  });

  await prisma.ambassadorRequest.create({
    data: {
      participantId: user.participant.id,
      universityId,
      occupation,
      gender,
      degree,
      semester,
      message,
    },
  });

  revalidatePath('/participant');
  revalidatePath('/participant/ambassador-application');
  redirect('/participant/ambassador-application');
}

export async function submitPaymentAction(formData: FormData) {
  const user = await requireParticipant();

  const invoiceId = String(formData.get('invoiceId') ?? '');
  const method = String(formData.get('method') ?? '').trim();
  const referenceNumber =
    String(formData.get('referenceNumber') ?? '').trim() || null;
  const proofUrl =
    String(formData.get('proofUrl') ?? '').trim() || null;

  const returnPath =
    user.role === 'AMBASSADOR' ? '/ambassador/payments' : '/participant/payments';

  if (!invoiceId || !method) {
    redirect(`${returnPath}?error=Payment method is required.`);
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      registration: {
        include: {
          team: {
            include: {
              members: true,
            },
          },
        },
      },
    },
  });

  const isOwner =
    invoice &&
    (invoice.registration.participantId === user.participant!.id ||
      invoice.registration.team?.captainId === user.participant!.id ||
      invoice.registration.team?.members.some(
        (m) => m.participantId === user.participant!.id
      ));

  if (!invoice || !isOwner) {
    redirect(`${returnPath}?error=Invoice not found.`);
  }

  if (invoice.status === 'PAID') {
    redirect(`${returnPath}?error=This invoice has already been paid.`);
  }

  if (user.role === 'PARTICIPANT') {
    const me = await prisma.participant.findUnique({
      where: { id: user.participant!.id },
      select: { universityId: true },
    });
    if (me?.universityId) {
      const campusAmbassadors = await prisma.ambassador.count({
        where: { universityId: me.universityId },
      });
      if (campusAmbassadors > 0) {
        redirect(`${returnPath}?error=Your campus Ambassador pays for your university in one combined payment.`);
      }
    }
  }

  const alreadySubmitted = await prisma.payment.count({
    where: { invoiceId: invoice.id, verificationStatus: 'SUBMITTED' },
  });
  if (alreadySubmitted > 0) {
    redirect(`${returnPath}?error=A payment for this invoice is already awaiting verification.`);
  }

  await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      amount: invoice.amount,
      method,
      referenceNumber,
      proofUrl,
    },
  });

  revalidatePath('/participant/payments');
  revalidatePath('/ambassador/payments');

  redirect(returnPath);
}

export async function cancelRegistrationAction(registrationId: string) {
  const user = await requireParticipant();

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { invoice: true },
  });

  if (!registration || registration.participantId !== user.participant!.id) {
    throw new Error('Registration not found.');
  }

  if (registration.status !== 'PENDING') {
    throw new Error('Only pending registrations can be cancelled.');
  }

  await prisma.$transaction([
    ...(registration.invoice ? [prisma.invoice.delete({ where: { id: registration.invoice.id } })] : []),
    prisma.registration.delete({ where: { id: registrationId } }),
  ]);
}
