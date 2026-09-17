import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { getSession } from '@/app/lib/session';
import { hasPurchased } from '@/app/lib/orders';
import { DRIVE_SCOPE, driveRedirectUri } from '@/app/lib/googleDrive';
import { DRIVE_STATE_COOKIE, DRIVE_STATE_COOKIE_PATH } from '@/app/lib/oauth';

/**
 * Starts "save this album to my Google Drive". A plain navigation, not a fetch,
 * so every outcome is a redirect the buyer can see rather than a JSON error.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { origin } = request.nextUrl;
  const back = (outcome: string) => NextResponse.redirect(new URL(`/albums?drive=${outcome}`, origin));

  const user = await getSession();
  if (!user) return NextResponse.redirect(new URL(`/gallery/${id}`, origin));

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = driveRedirectUri();
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET || !redirectUri) return back('not_configured');

  if (!(await hasPurchased(user.id, id))) return back('not_owned');

  const state = crypto.randomBytes(16).toString('hex');
  const cookieStore = await cookies();
  cookieStore.set(DRIVE_STATE_COOKIE, `${state}:${id}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: DRIVE_STATE_COOKIE_PATH,
    maxAge: 10 * 60,
  });

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', DRIVE_SCOPE);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('access_type', 'online');
  // Let buyers pick which Google account's Drive receives the album.
  authUrl.searchParams.set('prompt', 'select_account');

  return NextResponse.redirect(authUrl);
}
