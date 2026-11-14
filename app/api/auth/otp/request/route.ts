import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requestOtp } from '@/app/lib/otp';
import { checkOtpIpLimit, clientIp } from '@/app/lib/otpIpLimit';

const resend = new Resend(process.env.RESEND_API_KEY);

/** The sign-in email: the same monochrome look as the site, in Indonesian. */
function otpEmailHtml(code: string) {
  return `
    <div style="font-family: Poppins, Helvetica, Arial, sans-serif; max-width: 420px; margin: 0 auto; color: #0a0a0a;">
      <p style="font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 28px; margin: 0 0 24px;">
        Blackhand<span style="color: #6b6b6b;">.</span>
      </p>
      <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 8px; color: #6b6b6b;">
        Kode masuk Anda
      </p>
      <p style="font-family: 'Courier New', monospace; font-size: 34px; font-weight: 700; letter-spacing: 8px; margin: 0; padding: 16px 0; border-top: 1px solid #0a0a0a; border-bottom: 1px solid #0a0a0a;">
        ${code}
      </p>
      <p style="font-size: 14px; line-height: 1.6; margin: 20px 0 8px;">
        Masukkan kode ini di halaman masuk. Kode berlaku 5 menit.
      </p>
      <p style="font-size: 12px; line-height: 1.6; color: #6b6b6b; margin: 0;">
        Tidak merasa meminta kode? Abaikan email ini; akun Anda tetap aman.
      </p>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Masukkan alamat email yang valid.' }, { status: 400 });
    }

    const ipLimit = await checkOtpIpLimit(clientIp(request.headers));
    if (!ipLimit.ok) {
      const minutes = Math.ceil(ipLimit.retryAfterSeconds / 60);
      return NextResponse.json(
        { error: `Terlalu banyak permintaan kode dari jaringan Anda. Coba lagi dalam ${minutes} menit.` },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } }
      );
    }

    const result = await requestOtp(email);

    if (!result.ok) {
      if (result.reason === 'rate_limited') {
        return NextResponse.json(
          { error: 'Kode baru saja dikirim. Tunggu 3 menit sebelum meminta lagi.' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: 'Server sedang tidak bisa dihubungi. Coba lagi sebentar lagi.' },
        { status: 503 }
      );
    }

    const appEmail = process.env.NEXT_PUBLIC_APP_EMAIL || 'noreply@blackhand.dev';

    const { error: sendError } = await resend.emails.send({
      from: appEmail,
      to: email,
      subject: 'Kode masuk Blackhand',
      html: otpEmailHtml(result.code),
    });

    if (sendError) {
      console.error('Resend error:', sendError);
      return NextResponse.json({ error: 'Email kode gagal dikirim. Coba lagi.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('OTP request error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan. Coba lagi.' }, { status: 500 });
  }
}
