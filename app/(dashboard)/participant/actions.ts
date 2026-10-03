'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

async function requireParticipant() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'PARTICIPANT' || !user.participant) {
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
    where: {
      participantId: user.participant.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (existing?.status === 'PENDING') {
    redirect('/participant/ambassador-application');
  }

  if (existing?.status === 'APPROVED') {
    redirect('/participant');
  }

  const message =
    String(formData.get('message') ?? '').trim() || null;

  await prisma.ambassadorRequest.create({
    data: {
      participantId: user.participant.id,
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

  if (!invoiceId || !method) {
    redirect('/participant/payments?error=Payment method is required.');
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { registration: true },
  });

  if (
    !invoice ||
    invoice.registration.participantId !== user.participant!.id
  ) {
    redirect('/participant/payments?error=Invoice not found.');
  }

  if (invoice.status === 'PAID') {
    redirect('/participant/payments?error=This invoice has already been paid.');
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

  redirect('/participant/payments');
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
