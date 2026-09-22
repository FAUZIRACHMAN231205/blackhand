import 'server-only';
import crypto from 'node:crypto';
import { supabaseAdmin } from './supabaseAdmin';

/**
 * How many code requests one network may make. The per-email cooldown in
 * otp.ts stops anyone hammering a single inbox; this stops one source cycling
 * through many addresses to burn the email quota.
 *
 * Generous on purpose: a campus or office shares one public address, and a
 * session lasts 30 days, so real people rarely need more than a couple.
 */
export const IP_LIMITS = [
  { windowMs: 10 * 60 * 1000, max: 5 },
  { windowMs: 24 * 60 * 60 * 1000, max: 20 },
] as const;

const LOG_RETENTION_MS = 24 * 60 * 60 * 1000;

/**
 * The client's address as reported by the hosting proxy (Vercel, Nginx,
 * Cloudflare… set these; NextRequest.ip no longer exists). Only trustworthy
 * behind such a proxy — a server exposed directly lets clients write these
 * headers themselves.
 */
export function clientIp(headers: Headers): string | null {
  const real = headers.get('x-real-ip')?.trim();
  if (real) return real;
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || null;
}

/** Keyed hash, so the log never holds a raw address. */
function hashIp(ip: string): string {
  const pepper = process.env.OTP_PEPPER;
  if (!pepper) throw new Error('OTP_PEPPER tidak ditemukan. Periksa kembali file .env.local Anda.');
  return crypto.createHmac('sha256', pepper).update(ip).digest('hex');
}

export type IpLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/**
 * Count this request against its network and say whether it may proceed.
 *
 * Fails open (logs and allows) when the address is unknown or the log can't be
 * reached: locking every visitor out of sign-in is worse than briefly losing
 * this extra layer, and the per-email cooldown still holds.
 */
export async function checkOtpIpLimit(ip: string | null, now = Date.now()): Promise<IpLimitResult> {
  if (!ip) return { ok: true };

  let ipHash: string;
  try {
    ipHash = hashIp(ip);
  } catch (error) {
    console.error('OTP IP limit unavailable:', error);
    return { ok: true };
  }

  // Record first, then count. A read-then-write check lets a parallel burst
  // all read "0 so far" and slip through together; this way each request sees
  // the others' rows.
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('otp_request_log')
    .insert({ ip_hash: ipHash, created_at: new Date(now).toISOString() })
    .select('id')
    .single();

  if (insertError || !inserted) {
    console.error('OTP IP limit unavailable (has DATABASE_MIGRATION_OTP_IP_LIMIT.sql run?):', insertError);
    return { ok: true };
  }

  const since = new Date(now - LOG_RETENTION_MS).toISOString();
  const { data: rows, error: countError } = await supabaseAdmin
    .from('otp_request_log')
    .select('created_at')
    .eq('ip_hash', ipHash)
    .gte('created_at', since);

  // Housekeeping: nothing older than a day is ever needed again.
  await supabaseAdmin.from('otp_request_log').delete().lt('created_at', since);

  if (countError || !rows) {
    console.error('OTP IP limit count failed:', countError);
    return { ok: true };
  }

  const times = rows.map((r) => new Date(r.created_at as string).getTime()).sort((a, b) => a - b);

  for (const { windowMs, max } of IP_LIMITS) {
    const inWindow = times.filter((t) => t > now - windowMs);
    if (inWindow.length > max) {
      // A refused request shouldn't use up budget, or anyone who keeps
      // retrying would stay locked out indefinitely.
      await supabaseAdmin.from('otp_request_log').delete().eq('id', inserted.id);

      // With this request's row gone, count − 1 remain and the next request
      // fits once only max − 1 do: when the (count − max)-th oldest expires.
      const unlocksAt = inWindow[inWindow.length - max - 1] + windowMs;
      return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((unlocksAt - now) / 1000)) };
    }
  }

  return { ok: true };
}
