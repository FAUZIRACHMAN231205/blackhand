import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { OAUTH_STATE_COOKIE } from '@/app/lib/oauth';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Google OAuth belum dikonfigurasi. Periksa GOOGLE_CLIENT_ID / GOOGLE_REDIRECT_URI di .env.local.' },
      { status: 500 }
    );
  }

  const state = crypto.randomBytes(16).toString('hex');
  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 5 * 60, // 5 minutes
  });

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');

  return NextResponse.redirect(authUrl);
}
