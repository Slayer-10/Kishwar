'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
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

export async function createUniversityAction(formData: FormData) {
  await requireSuperAdmin();

  const name = String(formData.get('name') ?? '').trim();
  const city = String(formData.get('city') ?? '').trim() || null;

  if (!name) {
    redirect('/admin/universities?error=University name is required.');
  }

  try {
    await prisma.university.create({ data: { name, city } });
  } catch (err: any) {
    if (err.code === 'P2002') {
      redirect('/admin/universities?error=A university with this name already exists.');
    }
    redirect('/admin/universities?error=Failed to create university.');
  }

  revalidatePath('/admin/universities');
  redirect('/admin/universities');
}

export async function deleteUniversityAction(universityId: string) {
  await requireSuperAdmin();

  const [ambassadorCount, teamCount] = await Promise.all([
    prisma.ambassador.count({ where: { universityId } }),
    prisma.team.count({ where: { universityId } }),
  ]);

  if (ambassadorCount > 0 || teamCount > 0) {
    throw new Error('This university has ambassadors or teams linked to it and cannot be deleted.');
  }

  await prisma.university.delete({ where: { id: universityId } });
  revalidatePath('/admin/universities');
}

export async function createAnnouncementAction(formData: FormData) {
  await requireSuperAdmin();

  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();

  if (!title) {
    redirect('/admin/announcements?error=Title is required.');
  }
  if (!body) {
    redirect('/admin/announcements?error=Body is required.');
  }

  await prisma.announcement.create({ data: { title, body } });

  revalidatePath('/admin/announcements');
  redirect('/admin/announcements');
}

export async function togglePublishAnnouncementAction(announcementId: string, isPublished: boolean) {
  await requireSuperAdmin();

  await prisma.announcement.update({
    where: { id: announcementId },
    data: { isPublished, publishedAt: isPublished ? new Date() : null },
  });

  revalidatePath('/admin/announcements');
}

export async function deleteAnnouncementAction(announcementId: string) {
  await requireSuperAdmin();

  await prisma.announcement.delete({ where: { id: announcementId } });
  revalidatePath('/admin/announcements');
}

export async function createAmbassadorAction(formData: FormData) {
  await requireSuperAdmin();

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const universityId = String(formData.get('universityId') ?? '');
  const ambassadorCode = String(formData.get('ambassadorCode') ?? '').trim();

  if (!email || !password || !universityId || !ambassadorCode) {
    redirect('/admin/ambassadors?error=All fields are required.');
  }
  if (password.length < 8) {
    redirect('/admin/ambassadors?error=Password must be at least 8 characters.');
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    redirect('/admin/ambassadors?error=A user with this email already exists.');
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    redirect(`/admin/ambassadors?error=${encodeURIComponent(error?.message ?? 'Failed to create account.')}`);
  }

  try {
    await prisma.user.create({
      data: { id: data.user!.id, email, role: 'AMBASSADOR' },
    });

    await prisma.ambassador.create({
      data: {
        userId: data.user!.id,
        universityId,
        ambassadorCode,
      },
    });
  } catch (err: any) {
    await supabaseAdmin.auth.admin.deleteUser(data.user!.id);

    if (err.code === 'P2002') {
      redirect('/admin/ambassadors?error=This ambassador code is already in use.');
    }
    redirect('/admin/ambassadors?error=Failed to create ambassador record.');
  }

  revalidatePath('/admin/ambassadors');
  redirect('/admin/ambassadors');
}

export async function deleteAmbassadorAction(ambassadorId: string) {
  await requireSuperAdmin();

  const ambassador = await prisma.ambassador.findUnique({
    where: { id: ambassadorId },
    include: { _count: { select: { teams: true } } },
  });

  if (!ambassador) {
    throw new Error('Ambassador not found.');
  }

  if (ambassador._count.teams > 0) {
    throw new Error('This ambassador has teams linked to them and cannot be deleted.');
  }

  const supabaseAdmin = createSupabaseAdminClient();
  await supabaseAdmin.auth.admin.deleteUser(ambassador.userId);

  await prisma.ambassador.delete({ where: { id: ambassadorId } });
  await prisma.user.delete({ where: { id: ambassador.userId } });

  revalidatePath('/admin/ambassadors');
}


