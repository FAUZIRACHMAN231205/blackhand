-- Migration: per-network limit on OTP code requests.
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent).
--
-- Each row is one code request from one network. The address is stored only as
-- an HMAC (keyed with OTP_PEPPER), never in the clear, and rows older than a
-- day are deleted by the app as it goes.
--
-- Until this runs, the app logs an error and lets requests through; the
-- existing per-email cooldown still applies.

CREATE TABLE IF NOT EXISTS public.otp_request_log (
  id BIGSERIAL PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- "How many requests from this network lately?"
CREATE INDEX IF NOT EXISTS idx_otp_request_log_ip_time
  ON public.otp_request_log (ip_hash, created_at DESC);

-- "Delete everything older than a day."
CREATE INDEX IF NOT EXISTS idx_otp_request_log_time
  ON public.otp_request_log (created_at);

-- Server-only, like otp_codes: RLS on and no policies, so only the
-- service-role key can read or write it.
ALTER TABLE public.otp_request_log ENABLE ROW LEVEL SECURITY;
