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

  await prisma.registration.create({
    data: {
      eventId,
      participantId: user.participant!.id,
    },
  });

  revalidatePath('/participant');
  revalidatePath(`/events/${eventId}`);
}

export async function cancelRegistrationAction(registrationId: string) {
  const user = await requireParticipant();

  const registration = await prisma.registration.findUnique({ where: { id: registrationId } });

  if (!registration || registration.participantId !== user.participant!.id) {
    throw new Error('Registration not found.');
  }
  if (registration.status !== 'PENDING') {
    throw new Error('This registration can no longer be cancelled.');
  }

  await prisma.registration.delete({ where: { id: registrationId } });
  revalidatePath('/participant');
}
