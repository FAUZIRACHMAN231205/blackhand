import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requestOtp } from '@/app/lib/otp';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const result = await requestOtp(email);

    if (!result.ok) {
      if (result.reason === 'rate_limited') {
        return NextResponse.json(
          { error: 'Please wait 3 minutes before requesting another code' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: 'Could not reach the database. Please try again shortly.' },
        { status: 503 }
      );
    }

    const appEmail = process.env.NEXT_PUBLIC_APP_EMAIL || 'noreply@blackhand.dev';

    const { error: sendError } = await resend.emails.send({
      from: appEmail,
      to: email,
      subject: 'Your BLACKHAND Authentication Code',
      html: `
        <div style="font-family: 'Poppins', sans-serif; max-width: 400px; margin: 0 auto;">
          <h2 style="font-size: 28px; font-weight: 300; margin-bottom: 20px;">
            <span style="font-style: italic;">BLACKHAND</span>
          </h2>

          <p style="color: #666; margin-bottom: 20px; font-size: 14px;">
            Your authentication code is:
          </p>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">
              ${result.code}
            </p>
          </div>

          <p style="color: #999; font-size: 12px; margin-bottom: 10px;">
            This code will expire in 10 minutes.
          </p>

          <p style="color: #999; font-size: 12px;">
            If you didn't request this code, you can safely ignore this email.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

          <p style="color: #ccc; font-size: 11px; text-align: center;">
            &copy; 2026 BLACKHAND. All rights reserved.
          </p>
        </div>
      `,
    });

    if (sendError) {
      console.error('Resend error:', sendError);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('OTP request error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg || 'Internal server error' }, { status: 500 });
  }
}
