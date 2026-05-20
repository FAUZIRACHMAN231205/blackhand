import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    const appEmail = process.env.NEXT_PUBLIC_APP_EMAIL || 'noreply@blackhand.dev';

    const response = await resend.emails.send({
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
              ${otp}
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
            © 2025 BLACKHAND. All rights reserved.
          </p>
        </div>
      `,
    });

    if (response.error) {
      console.error('Resend error:', response.error);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      id: response.data?.id,
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
