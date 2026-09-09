import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp } from '@/app/lib/otp';
import { upsertUser } from '@/app/lib/users';
import { setSessionCookie } from '@/app/lib/session';

const ERROR_MESSAGES: Record<string, string> = {
  not_found: 'Code not found. Please request a new one.',
  expired: 'Code has expired. Please request a new one.',
  too_many_attempts: 'Too many failed attempts. Please request a new code.',
  invalid_code: 'Invalid code. Please try again.',
  db_error: 'Could not reach the database. Please try again shortly.',
};

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
    }

    const result = await verifyOtp(email, code);

    if (!result.ok) {
      const status = result.reason === 'db_error' ? 503 : 401;
      return NextResponse.json(
        { error: ERROR_MESSAGES[result.reason] || 'Verification failed' },
        { status }
      );
    }

    const user = await upsertUser({ email, provider: 'email' });
    await setSessionCookie(user);

    return NextResponse.json({ user });
  } catch (error: unknown) {
    console.error('OTP verify error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg || 'Internal server error' }, { status: 500 });
  }
}
