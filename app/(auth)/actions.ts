'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: '/admin',
  FDO: '/fdo',
  AMBASSADOR: '/ambassador',
  PARTICIPANT: '/participant',
};

export async function signUpAction(formData: FormData) {
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));
  const fullName = String(formData.get('fullName'));

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error || !data.user) {
    return { error: error?.message ?? 'Sign up failed' };
  }

  await prisma.user.create({
    data: {
      id: data.user.id,
      email,
      role: 'PARTICIPANT',
    },
  });

  await prisma.participant.create({
    data: {
      userId: data.user.id,
      fullName,
    },
  });

  redirect('/login');
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const dbUser = await prisma.user.findUnique({ where: { email } });
  redirect(ROLE_HOME[dbUser?.role ?? 'PARTICIPANT']);
}

export async function forgotPasswordAction(formData: FormData) {
  const email = String(formData.get('email'));
  const supabase = createSupabaseServerClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function resetPasswordAction(formData: FormData) {
  const password = String(formData.get('password'));
  const supabase = createSupabaseServerClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };
  redirect('/login');
}
