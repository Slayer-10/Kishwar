'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
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
  const user = await requireParticipant();

  const existingAmbassador = await prisma.ambassador.findUnique({
    where: { userId: user.id },
  });

  if (existingAmbassador) {
    throw new Error('You are already an Ambassador.');
  }

  const existingRequest = await prisma.ambassadorRequest.findFirst({
    where: {
      participantId: user.participant!.id,
      status: 'PENDING',
    },
  });

  if (existingRequest) {
    throw new Error('Your Ambassador request is already pending.');
  }

  const message = String(formData.get('message') ?? '').trim() || null;

  await prisma.ambassadorRequest.create({
    data: {
      participantId: user.participant!.id,
      message,
    },
  });

  redirect('/participant?ambassadorRequest=submitted');
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
