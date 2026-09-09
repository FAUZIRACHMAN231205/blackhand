// Optimistic route protection (see node_modules/next/dist/docs authentication guide).
// This only checks the signed session cookie — no DB access here. Every protected
// page and API route still does its own authoritative check (DAL pattern via
// app/lib/session.ts + app/lib/apiAuth.ts), so this is a UX shortcut, not the
// security boundary.

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { isAdmin } from '@/app/lib/adminUtils';

const SESSION_COOKIE = 'bh_session';

// /gallery and /works are intentionally public: visitors can browse published
// works without an account. Signing in is only required to rate or comment,
// which the API routes enforce on their own.
const PROTECTED_PATHS = ['/dashboard', '/settings', '/admin'];
const ADMIN_ONLY_PATHS = ['/admin'];

async function readSessionUser(token: string | undefined) {
  if (!token || !process.env.SESSION_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET));
    return {
      id: payload.id as string,
      email: payload.email as string,
      full_name: (payload.full_name as string | null) ?? null,
      avatar_url: (payload.avatar_url as string | null) ?? null,
      provider: payload.provider as string,
      role: (payload.role as 'user' | 'admin') ?? 'user',
    };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = await readSessionUser(token);

  if (!user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const isAdminPath = ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p));
  if (isAdminPath && !isAdmin(user)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*', '/admin/:path*'],
};
