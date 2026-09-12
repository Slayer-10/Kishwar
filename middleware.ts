import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';

const PROTECTED_PREFIXES = ['/admin', '/fdo', '/ambassador', '/participant'];

// This middleware only checks that a session exists and refreshes it.
// It does NOT check role — Prisma cannot run in the Edge runtime that
// middleware executes in. Role checks happen in each dashboard's layout.tsx
// (server component, Node runtime) via getCurrentUser().
export async function middleware(request: NextRequest) {
  const { supabase, response } = createSupabaseMiddlewareClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));

  if (!isProtected) return response;

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/fdo/:path*', '/ambassador/:path*', '/participant/:path*'],
};
