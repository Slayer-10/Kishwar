'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

async function requireAmbassador() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'AMBASSADOR' || !user.ambassador) {
    redirect('/login');
  }

  return user;
}

export async function registerParticipantAction(formData: FormData) {
  const user = await requireAmbassador();

  const eventId = String(formData.get('eventId') ?? '').trim();
  const participantEmail = String(
    formData.get('participantEmail') ?? ''
  ).trim().toLowerCase();

  if (!eventId || !participantEmail) {
    throw new Error('Event and participant email are required.');
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

  if (event.registrationType === 'TEAM') {
    throw new Error('This event only accepts team registration.');
  }

  const participant = await prisma.participant.findUnique({
    where: { email: participantEmail },
  });

  if (!participant) {
    throw new Error(
      'No KISHWAR participant account exists with this email. The participant must create an account first.'
    );
  }

  const existing = await prisma.registration.findFirst({
    where: {
      eventId,
      participantId: participant.id,
    },
  });

  if (existing) {
    throw new Error('This participant is already registered for this event.');
  }

  const registration = await prisma.registration.create({
    data: {
      eventId,
      participantId: participant.id,
      ambassadorId: user.ambassador!.id,
    },
  });

  await prisma.invoice.create({
    data: {
      registrationId: registration.id,
      invoiceNumber: `INV-${randomUUID()
        .slice(0, 8)
        .toUpperCase()}`,
      amount: event.registrationFee,
    },
  });

  revalidatePath('/ambassador');
  revalidatePath('/ambassador/participants');
}

export async function registerTeamAction(formData: FormData) {
  const user = await requireAmbassador();

  const eventId = String(formData.get('eventId') ?? '').trim();
  const teamName = String(formData.get('teamName') ?? '').trim();

  const captainEmail = String(
    formData.get('captainEmail') ?? ''
  ).trim().toLowerCase();

  const memberEmails = formData
    .getAll('memberEmails')
    .map((value) => String(value).trim().toLowerCase())
    .filter(Boolean);

  if (!eventId || !teamName || !captainEmail) {
    throw new Error(
      'Event, team name, and captain email are required.'
    );
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

  const ambassador = await prisma.ambassador.findUnique({
    where: { id: user.ambassador!.id },
  });

  if (!ambassador) {
    throw new Error('Ambassador record not found.');
  }

  const captain = await prisma.participant.findUnique({
    where: { email: captainEmail },
  });

  if (!captain) {
    throw new Error(
      'The captain must already have a KISHWAR participant account.'
    );
  }

  const uniqueEmails = [
    captainEmail,
    ...memberEmails.filter((email) => email !== captainEmail),
  ];

  const participants = await prisma.participant.findMany({
    where: {
      email: {
        in: uniqueEmails,
      },
    },
  });

  if (participants.length !== uniqueEmails.length) {
    throw new Error(
      'One or more participants do not have KISHWAR accounts. Every team member must already have an account.'
    );
  }

  const participantMap = new Map(
    participants.map((participant) => [
      participant.email.toLowerCase(),
      participant,
    ])
  );

  const captainRecord = participantMap.get(captainEmail);

  if (!captainRecord) {
    throw new Error('Captain account not found.');
  }

  const allParticipantIds = uniqueEmails.map(
    (email) => participantMap.get(email)!.id
  );

  if (
    event.minTeamSize &&
    allParticipantIds.length < event.minTeamSize
  ) {
    throw new Error(
      `This event requires at least ${event.minTeamSize} team members.`
    );
  }

  if (
    event.maxTeamSize &&
    allParticipantIds.length > event.maxTeamSize
  ) {
    throw new Error(
      `This event allows at most ${event.maxTeamSize} team members.`
    );
  }

  const conflictingRegistration =
    await prisma.registration.findFirst({
      where: {
        eventId,
        OR: [
          {
            participantId: {
              in: allParticipantIds,
            },
          },
          {
            team: {
              captainId: {
                in: allParticipantIds,
              },
            },
          },
          {
            team: {
              members: {
                some: {
                  participantId: {
                    in: allParticipantIds,
                  },
                },
              },
            },
          },
        ],
      },
    });

  if (conflictingRegistration) {
    throw new Error(
      'One or more team members are already registered for this event.'
    );
  }

  const team = await prisma.team.create({
    data: {
      name: teamName,
      captainId: captainRecord.id,
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

  const registration = await prisma.registration.create({
    data: {
      eventId,
      teamId: team.id,
      ambassadorId: ambassador.id,
    },
  });

  await prisma.invoice.create({
    data: {
      registrationId: registration.id,
      invoiceNumber: `INV-${randomUUID()
        .slice(0, 8)
        .toUpperCase()}`,
      amount: event.registrationFee,
    },
  });

  revalidatePath('/ambassador');
  revalidatePath('/ambassador/participants');

  redirect('/ambassador');
}
