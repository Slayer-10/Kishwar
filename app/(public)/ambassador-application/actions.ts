'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function submitPublicAmbassadorApplication(
  formData: FormData
) {
  const user = await getCurrentUser();

  const fullName = String(formData.get('fullName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const phone = String(formData.get('phone') ?? '').trim();
  const gender = String(formData.get('gender') ?? '').trim();
  const cnic = String(formData.get('cnic') ?? '').trim();
  const universityId = String(formData.get('universityId') ?? '').trim();
  const occupation = String(formData.get('occupation') ?? '').trim();
  const degree = String(formData.get('degree') ?? '').trim();
  const semesterRaw = String(formData.get('semester') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  const studentCardFile = formData.get('studentCard') as File | null;

  if (!fullName || !email || !phone || !gender || !cnic || !universityId || !occupation) {
    throw new Error('Please complete all required fields.');
  }

  const university = await prisma.university.findUnique({
    where: { id: universityId },
  });

  if (!university) {
    throw new Error('Selected university was not found.');
  }

  const existingPending = await prisma.ambassadorRequest.findFirst({
    where: {
      email,
      status: 'PENDING',
    },
  });

  if (existingPending) {
    throw new Error('An ambassador application for this email is already under review.');
  }

  let studentCardUrl: string | null = null;

  if (studentCardFile && studentCardFile.size > 0) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(studentCardFile.type)) {
      throw new Error('Student Card must be a JPG, JPEG, PNG, or WEBP image.');
    }
    if (studentCardFile.size > 10 * 1024 * 1024) {
      throw new Error('Student Card image must be under 10MB.');
    }

    const supabase = createSupabaseAdminClient();
    const bucketName = 'student-cards';

    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === bucketName)) {
      await supabase.storage.createBucket(bucketName, { public: true });
    }

    const bytes = await studentCardFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileExt = studentCardFile.name.split('.').pop() || 'png';
    const filePath = `ambassador-applications/${user?.participant?.id ?? 'public'}/${Date.now()}.${fileExt}`;

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

    studentCardUrl = publicUrlData.publicUrl;
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
      universityId,
      occupation,
      degree: degree || null,
      semester: semesterRaw ? Number(semesterRaw) : null,
      studentCardUrl,
      message: message || null,
    },
  });

  revalidatePath('/admin/ambassador-requests');
  revalidatePath('/ambassador-application');

  redirect(`/ambassador-application?submitted=1&request=${request.id}&email=${encodeURIComponent(email)}`);
}
