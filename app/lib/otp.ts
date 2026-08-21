import 'server-only';
import crypto from 'node:crypto';
import { supabaseAdmin } from './supabaseAdmin';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_RESEND_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes
const MAX_VERIFY_ATTEMPTS = 5;

function getPepper() {
  const pepper = process.env.OTP_PEPPER;
  if (!pepper) {
    throw new Error('OTP_PEPPER tidak ditemukan. Periksa kembali file .env.local Anda.');
  }
  return pepper;
}

export function generateCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashCode(email: string, code: string): string {
  return crypto
    .createHash('sha256')
    .update(`${email.toLowerCase()}:${code}:${getPepper()}`)
    .digest('hex');
}

export type RequestOtpResult =
  | { ok: true; code: string }
  | { ok: false; reason: 'rate_limited' | 'db_error' };

export async function requestOtp(email: string): Promise<RequestOtpResult> {
  const normalizedEmail = email.toLowerCase().trim();

  const { data: recent, error: recentError } = await supabaseAdmin
    .from('otp_codes')
    .select('created_at')
    .eq('email', normalizedEmail)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentError) {
    console.error('Error checking recent OTP:', recentError);
    return { ok: false, reason: 'db_error' };
  }

  if (recent && Date.now() - new Date(recent.created_at).getTime() < OTP_RESEND_COOLDOWN_MS) {
    return { ok: false, reason: 'rate_limited' };
  }

  const code = generateCode();
  const codeHash = hashCode(normalizedEmail, code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  // One active code per email at a time.
  const { error: deleteError } = await supabaseAdmin.from('otp_codes').delete().eq('email', normalizedEmail);
  if (deleteError) {
    console.error('Error clearing previous OTP:', deleteError);
    return { ok: false, reason: 'db_error' };
  }

  const { error: insertError } = await supabaseAdmin.from('otp_codes').insert({
    email: normalizedEmail,
    code_hash: codeHash,
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error('Error storing OTP:', insertError);
    return { ok: false, reason: 'db_error' };
  }

  return { ok: true, code };
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'expired' | 'too_many_attempts' | 'invalid_code' | 'db_error' };

export async function verifyOtp(email: string, code: string): Promise<VerifyOtpResult> {
  const normalizedEmail = email.toLowerCase().trim();

  const { data: row, error: selectError } = await supabaseAdmin
    .from('otp_codes')
    .select('id, code_hash, expires_at, attempts')
    .eq('email', normalizedEmail)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    console.error('Error looking up OTP:', selectError);
    return { ok: false, reason: 'db_error' };
  }

  if (!row) {
    return { ok: false, reason: 'not_found' };
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await supabaseAdmin.from('otp_codes').delete().eq('id', row.id);
    return { ok: false, reason: 'expired' };
  }

  if (row.attempts >= MAX_VERIFY_ATTEMPTS) {
    await supabaseAdmin.from('otp_codes').delete().eq('id', row.id);
    return { ok: false, reason: 'too_many_attempts' };
  }

  const submittedHash = hashCode(normalizedEmail, code);
  if (submittedHash !== row.code_hash) {
    await supabaseAdmin
      .from('otp_codes')
      .update({ attempts: row.attempts + 1 })
      .eq('id', row.id);
    return { ok: false, reason: 'invalid_code' };
  }

  await supabaseAdmin.from('otp_codes').delete().eq('id', row.id);
  return { ok: true };
}
