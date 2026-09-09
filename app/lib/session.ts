import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { User } from '@/app/types';

export const SESSION_COOKIE = 'bh_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET tidak ditemukan. Periksa kembali file .env.local Anda.');
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(user: User): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<User | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      id: payload.id as string,
      email: payload.email as string,
      full_name: (payload.full_name as string | null) ?? null,
      avatar_url: (payload.avatar_url as string | null) ?? null,
      provider: payload.provider as string,
      role: (payload.role as 'user' | 'admin') ?? 'user',
      created_at: payload.created_at as string | undefined,
      last_sign_in_at: payload.last_sign_in_at as string | undefined,
    };
  } catch {
    return null;
  }
}

// Data Access Layer entry point — call this from Route Handlers / Server Components
// to get the current authenticated user (or null).
export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function setSessionCookie(user: User) {
  const token = await signSession(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
