import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { OAUTH_STATE_COOKIE } from '@/app/lib/oauth';
import { upsertUser } from '@/app/lib/users';
import { setSessionCookie } from '@/app/lib/session';

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
}

interface GoogleUserInfo {
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin: requestOrigin } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  // Behind a reverse proxy/tunnel the request's Host header can resolve to the
  // local bind address (e.g. 0.0.0.0) instead of the public URL. GOOGLE_REDIRECT_URI
  // is the one address we know Google actually reached us on, so prefer its origin.
  const origin = redirectUri ? new URL(redirectUri).origin : requestOrigin;

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL('/?authError=google_state_mismatch', origin));
  }

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL('/?authError=google_not_configured', origin));
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenRes.status}`);
    }

    const tokens = (await tokenRes.json()) as GoogleTokenResponse;

    const userInfoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoRes.ok) {
      throw new Error(`Failed to fetch Google userinfo: ${userInfoRes.status}`);
    }

    const googleUser = (await userInfoRes.json()) as GoogleUserInfo;

    if (!googleUser.email || !googleUser.email_verified) {
      return NextResponse.redirect(new URL('/?authError=google_email_unverified', origin));
    }

    const user = await upsertUser({
      email: googleUser.email,
      full_name: googleUser.name ?? null,
      avatar_url: googleUser.picture ?? null,
      provider: 'google',
    });

    await setSessionCookie(user);

    return NextResponse.redirect(new URL('/dashboard', origin));
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(new URL('/?authError=google_login_failed', origin));
  }
}
