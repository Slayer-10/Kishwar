'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { RegistrationType, EventStatus } from '@prisma/client';

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
  await requireSuperAdmin();

  const [teamCount, registrationCount] = await Promise.all([
    prisma.team.count({ where: { eventId } }),
    prisma.registration.count({ where: { eventId } }),
  ]);

  if (teamCount > 0 || registrationCount > 0) {
    throw new Error(
      'This event already has teams or registrations and cannot be deleted. Set its status to CANCELLED instead.'
    );
  }

  await prisma.event.delete({ where: { id: eventId } });
  revalidatePath('/admin');
}
