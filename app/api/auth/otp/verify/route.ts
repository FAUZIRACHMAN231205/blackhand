import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp } from '@/app/lib/otp';
import { upsertUser } from '@/app/lib/users';
import { setSessionCookie } from '@/app/lib/session';

const ERROR_MESSAGES: Record<string, string> = {
  not_found: 'Kode tidak ditemukan. Minta kode baru.',
  expired: 'Kode sudah kedaluwarsa. Minta kode baru.',
  too_many_attempts: 'Terlalu banyak percobaan salah. Minta kode baru.',
  invalid_code: 'Kode salah. Periksa lagi lalu coba.',
  db_error: 'Server sedang tidak bisa dihubungi. Coba lagi sebentar lagi.',
};

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Email dan kode wajib diisi.' }, { status: 400 });
    }

    const result = await verifyOtp(email, code);

    if (!result.ok) {
      const status = result.reason === 'db_error' ? 503 : 401;
      return NextResponse.json(
        { error: ERROR_MESSAGES[result.reason] || 'Kode gagal diperiksa. Coba lagi.' },
        { status }
      );
    }

    const user = await upsertUser({ email, provider: 'email' });
    await setSessionCookie(user);

    return NextResponse.json({ user });
  } catch (error: unknown) {
    console.error('OTP verify error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan. Coba lagi.' }, { status: 500 });
  }
}
