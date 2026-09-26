'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';

async function requireParticipant() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }
  if (user.role !== 'PARTICIPANT' || !user.participant) {
    throw new Error('Only participant accounts can register for events.');
  }

  return user;
}

export async function registerForEventAction(eventId: string) {
  const user = await requireParticipant();

  const event = await prisma.event.findUnique({ where: { id: eventId } });

  if (!event) {
    throw new Error('Event not found.');
  }
  if (event.status !== 'OPEN') {
    throw new Error('This event is not open for registration.');
  }
  if (event.deadline < new Date()) {
    throw new Error('The registration deadline for this event has passed.');
  }
  if (event.registrationType === 'TEAM') {
    throw new Error('This event requires a team registration, which is not available yet.');
  }

  const existing = await prisma.registration.findFirst({
    where: { eventId, participantId: user.participant!.id },
  });
  if (existing) {
    throw new Error('You are already registered for this event.');
  }

  const registration = await prisma.registration.create({
    data: {
      eventId,
      participantId: user.participant!.id,
    },
  });

  await prisma.invoice.create({
    data: {
      registrationId: registration.id,
      invoiceNumber: `INV-${randomUUID().slice(0, 8).toUpperCase()}`,
      amount: event.registrationFee,
    },
  });

  revalidatePath('/participant');
  revalidatePath('/participant/payments');
  revalidatePath(`/events/${eventId}`);
}

export async function cancelRegistrationAction(registrationId: string) {
  const user = await requireParticipant();

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { invoice: { include: { payments: true } } },
  });

  if (!registration || registration.participantId !== user.participant!.id) {
    throw new Error('Registration not found.');
  }
  if (registration.status !== 'PENDING') {
    throw new Error('This registration can no longer be cancelled.');
  }
  if (registration.invoice && registration.invoice.payments.length > 0) {
    throw new Error('A payment has already been submitted for this registration and it can no longer be cancelled.');
  }

  if (registration.invoice) {
    await prisma.invoice.delete({ where: { id: registration.invoice.id } });
  }
  await prisma.registration.delete({ where: { id: registrationId } });

  revalidatePath('/participant');
  revalidatePath('/participant/payments');
}

export async function submitPaymentAction(formData: FormData) {
  const user = await requireParticipant();

  const invoiceId = String(formData.get('invoiceId') ?? '');
  const method = String(formData.get('method') ?? '').trim();
  const referenceNumber = String(formData.get('referenceNumber') ?? '').trim() || null;
  const proofUrl = String(formData.get('proofUrl') ?? '').trim() || null;

  if (!invoiceId || !method) {
    redirect('/participant/payments?error=Payment method is required.');
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { registration: true },
  });

  if (!invoice || invoice.registration.participantId !== user.participant!.id) {
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

  revalidatePath('/participant/payments');
  redirect('/participant/payments');
}

export async function registerTeamAction(eventId: string, formData: FormData) {
  const user = await requireParticipant();

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new Error('Event not found.');
  }
  if (event.status !== 'OPEN') {
    throw new Error('This event is not open for registration.');
  }
  if (event.deadline < new Date()) {
    throw new Error('The registration deadline for this event has passed.');
  }
  if (event.registrationType === 'INDIVIDUAL') {
    throw new Error('This event only accepts individual registration.');
  }

  const teamName = String(formData.get('teamName') ?? '').trim();
  const memberEmails = formData.getAll('memberEmails')
    .map((e) => String(e).trim().toLowerCase())
    .filter(Boolean);

  if (!teamName) {
    throw new Error('Team name is required.');
  }

  const existingOwnReg = await prisma.registration.findFirst({
    where: {
      eventId,
      OR: [
        { participantId: user.participant!.id },
        { team: { captainId: user.participant!.id } },
        { team: { members: { some: { participantId: user.participant!.id } } } },
      ],
    },
  });
  if (existingOwnReg) {
    throw new Error('You are already registered for this event.');
  }

  const memberParticipants = memberEmails.length > 0
    ? await prisma.participant.findMany({
        where: { user: { email: { in: memberEmails } } },
        include: { user: true },
      })
    : [];

  if (memberParticipants.length !== memberEmails.length) {
    throw new Error('One or more teammate emails could not be found. They must already have an account.');
  }

  const memberIds = memberParticipants.map((p) => p.id);
  if (memberIds.includes(user.participant!.id)) {
    throw new Error('You cannot list yourself as a teammate.');
  }

  const totalSize = 1 + memberIds.length;
  if (event.minTeamSize && totalSize < event.minTeamSize) {
    throw new Error(`This event requires at least ${event.minTeamSize} members, including you.`);
  }
  if (event.maxTeamSize && totalSize > event.maxTeamSize) {
    throw new Error(`This event allows at most ${event.maxTeamSize} members, including you.`);
  }

  if (memberIds.length > 0) {
    const conflicting = await prisma.registration.findFirst({
      where: {
        eventId,
        OR: [
          { participantId: { in: memberIds } },
          { team: { captainId: { in: memberIds } } },
          { team: { members: { some: { participantId: { in: memberIds } } } } },
        ],
      },
    });
    if (conflicting) {
      throw new Error('One or more teammates are already registered for this event.');
    }
  }

  const team = await prisma.team.create({
    data: {
      name: teamName,
      captainId: user.participant!.id,
      eventId,
      members: {
        create: [{ participantId: user.participant!.id }, ...memberIds.map((id) => ({ participantId: id }))],
      },
    },
  });

  const registration = await prisma.registration.create({
    data: { eventId, teamId: team.id },
  });

  await prisma.invoice.create({
    data: {
      registrationId: registration.id,
      invoiceNumber: `INV-${randomUUID().slice(0, 8).toUpperCase()}`,
      amount: event.registrationFee,
    },
  });

  revalidatePath('/participant');
  revalidatePath('/participant/payments');
  revalidatePath(`/events/${eventId}`);
  redirect('/participant');
}

