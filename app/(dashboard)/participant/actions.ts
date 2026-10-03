'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
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

  if (existing?.status === 'PENDING' || existing?.status === 'APPROVED') {
    redirect('/participant/ambassador-application');
  }

  const fullName = String(formData.get('fullName') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const cnic = String(formData.get('cnic') ?? '').trim();
  const gender = String(formData.get('gender') ?? '').trim();
  const universityId = String(formData.get('universityId') ?? '').trim();
  const occupation = String(formData.get('occupation') ?? '').trim();
  const degree = String(formData.get('degree') ?? '').trim();
  const semesterRaw = String(formData.get('semester') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim() || null;
  const studentCardFile = formData.get('studentCard') as File | null;

  if (
    !fullName ||
    !phone ||
    !cnic ||
    !gender ||
    !universityId ||
    !occupation ||
    !degree ||
    !semesterRaw
  ) {
    throw new Error('All required personal and academic fields must be filled.');
  }

  const semester = parseInt(semesterRaw, 10);
  if (isNaN(semester) || semester < 1) {
    throw new Error('Semester must be a valid positive number.');
  }

  if (!studentCardFile || studentCardFile.size === 0) {
    throw new Error('Clear picture of Student Card is required.');
  }

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(studentCardFile.type)) {
    throw new Error('Student Card must be a JPG, JPEG, PNG, or WEBP image.');
  }

  const university = await prisma.university.findUnique({
    where: { id: universityId },
  });
  if (!university) {
    throw new Error('Selected university not found.');
  }

  // Upload student card to Supabase Storage
  const supabase = createSupabaseAdminClient();
  const bucketName = 'student-cards';

  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === bucketName)) {
    await supabase.storage.createBucket(bucketName, { public: true });
  }

  const bytes = await studentCardFile.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const fileExt = studentCardFile.name.split('.').pop() || 'png';
  const filePath = `ambassador-applications/${user.participant.id}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, buffer, {
      contentType: studentCardFile.type,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload student card: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  const studentCardUrl = publicUrlData.publicUrl;

  // Update participant details
  await prisma.participant.update({
    where: { id: user.participant.id },
    data: {
      fullName,
      phone,
      cnic,
    },
  });

  // Create Ambassador Request
  await prisma.ambassadorRequest.create({
    data: {
      participantId: user.participant.id,
      universityId,
      occupation,
      gender,
      degree,
      semester,
      studentCardUrl,
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
