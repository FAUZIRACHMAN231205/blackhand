// Optimistic route protection (see node_modules/next/dist/docs authentication guide).
// This only checks the signed session cookie — no DB access here. Every protected
// page and API route still does its own authoritative check (DAL pattern via
// app/lib/session.ts + app/lib/apiAuth.ts), so this is a UX shortcut, not the
// security boundary.

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { isAdmin } from '@/app/lib/adminUtils';
import { ACCOUNT_HOME, isActivePath } from '@/app/lib/routes';

const SESSION_COOKIE = 'bh_session';

// /gallery and /shop are intentionally public: visitors can browse without an
// account. Signing in is only required to rate, comment or buy, which the API
// routes enforce on their own. Retired addresses (/dashboard, /orders, …) are
// redirected in next.config.ts before this runs.
const PROTECTED_PATHS = [ACCOUNT_HOME, '/admin'];
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
  const isProtected = PROTECTED_PATHS.some((p) => isActivePath(pathname, p));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = await readSessionUser(token);

  if (!user) {
    // The home page opens the sign-in dialog for ?masuk=1.
    return NextResponse.redirect(new URL('/?masuk=1', request.url));
  }

  const isAdminPath = ADMIN_ONLY_PATHS.some((p) => isActivePath(pathname, p));
  if (isAdminPath && !isAdmin(user)) {
    return NextResponse.redirect(new URL(ACCOUNT_HOME, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/account', '/account/:path*', '/admin', '/admin/:path*'],
};
