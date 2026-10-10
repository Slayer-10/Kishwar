'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { assertValidUniversityName, findOrCreateUniversity } from '@/lib/university';

const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: '/admin',
  FDO: '/fdo',
  AMBASSADOR: '/ambassador',
  PARTICIPANT: '/participant',
};

function getValidRedirectUrl(next: string | null | undefined, userRole: string): string {
  const defaultHome = ROLE_HOME[userRole] ?? '/participant';

  if (!next || typeof next !== 'string') return defaultHome;
  const trimmed = next.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) {
    return defaultHome;
  }

  try {
    const parsed = new URL(trimmed, 'http://localhost');
    if (parsed.pathname !== trimmed && (parsed.pathname + parsed.search + parsed.hash) !== trimmed) {
      return defaultHome;
    }
  } catch {
    return defaultHome;
  }

  if (trimmed.startsWith('/admin') && userRole !== 'SUPER_ADMIN') {
    return defaultHome;
  }
  if (trimmed.startsWith('/fdo') && userRole !== 'FDO') {
    return defaultHome;
  }
  if (trimmed.startsWith('/ambassador') && userRole !== 'AMBASSADOR') {
    return defaultHome;
  }
  if (trimmed.startsWith('/participant') && userRole !== 'PARTICIPANT') {
    return defaultHome;
  }

  return trimmed;
}

export async function signUpAction(
  prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));
  const fullName = String(formData.get('fullName'));
  let universityName: string;
  try {
    universityName = assertValidUniversityName(formData.get('university'));
  } catch (e: any) {
    return { error: e.message };
  }
  const next = formData.get('next') ? String(formData.get('next')) : null;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: 'An account with this email already exists. Please log in instead.' };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error || !data.user) {
    return { error: error?.message ?? 'Sign up failed' };
  }

  const university = await findOrCreateUniversity(universityName);

  await prisma.$transaction([
    prisma.user.create({
      data: { id: data.user.id, email, role: 'PARTICIPANT' },
    }),
    prisma.participant.create({
      data: { userId: data.user.id, fullName, email, universityId: university.id },
    }),
  ]);

  const loginTarget = next ? `/login?next=${encodeURIComponent(next)}` : '/login';
  redirect(loginTarget);
}

export async function signInAction(
  prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));
  const next = formData.get('next') ? String(formData.get('next')) : null;

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const dbUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!dbUser) {
    return {
      error: 'Your account exists in authentication but no application profile was found. Please contact the administrator.',
    };
  }

  const destination = getValidRedirectUrl(next, dbUser.role);
  redirect(destination);
}

export async function forgotPasswordAction(
  prevState: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const email = String(formData.get('email'));
  const supabase = createSupabaseServerClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function resetPasswordAction(
  prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const password = String(formData.get('password'));
  const supabase = createSupabaseServerClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };
  redirect('/login');
}
