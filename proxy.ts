// Optimistic route protection (see node_modules/next/dist/docs authentication guide).
// This only checks the signed session cookie — no DB access here. Every protected
// page and API route still does its own authoritative check (DAL pattern via
// app/lib/session.ts + app/lib/apiAuth.ts), so this is a UX shortcut, not the
// security boundary.

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { isAdmin } from '@/app/lib/adminUtils';

const SESSION_COOKIE = 'bh_session';

const PROTECTED_PATHS = ['/dashboard', '/settings', '/gallery', '/works', '/admin'];
const ADMIN_ONLY_PATHS = ['/admin'];

async function readSessionEmail(token: string | undefined): Promise<string | null> {
  if (!token || !process.env.SESSION_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET));
    return (payload.email as string) ?? null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const email = await readSessionEmail(token);

  if (!email) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const isAdminPath = ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p));
  if (isAdminPath && !isAdmin(email)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*', '/gallery/:path*', '/works/:path*', '/admin/:path*'],
};
