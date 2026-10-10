'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { findOrCreateUniversity } from '@/lib/university';

export async function submitPublicAmbassadorApplication(
  formData: FormData
) {
  const user = await getCurrentUser();

  const fullName = String(formData.get('fullName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const phone = String(formData.get('phone') ?? '').trim();
  const gender = String(formData.get('gender') ?? '').trim();
  const cnic = String(formData.get('cnic') ?? '').trim();
  const universityNameRaw = String(formData.get('universityName') ?? '').trim();
  const occupation = String(formData.get('occupation') ?? '').trim();
  const degree = String(formData.get('degree') ?? '').trim();
  const semesterRaw = String(formData.get('semester') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();

  if (!fullName || !email || !phone || !gender || !cnic || !universityNameRaw || !occupation) {
    throw new Error('Please complete all required fields.');
  }

  const university = await findOrCreateUniversity(universityNameRaw);

  const existingPending = await prisma.ambassadorRequest.findFirst({
    where: {
      email,
      status: 'PENDING',
    },
  });

  if (existingPending) {
    throw new Error('An ambassador application for this email is already under review.');
  }

  const participantId = user?.participant ? user.participant.id : null;

  const request = await prisma.ambassadorRequest.create({
    data: {
      participantId,
      fullName,
      email,
      phone,
      gender,
      cnic,
      universityId: university.id,
      occupation,
      degree: degree || null,
      semester: semesterRaw ? Number(semesterRaw) : null,
      message: message || null,
    },
  });

  revalidatePath('/admin/ambassador-requests');
  revalidatePath('/ambassador-application');

  redirect(`/ambassador-application?submitted=1&request=${request.id}&email=${encodeURIComponent(email)}`);
}
