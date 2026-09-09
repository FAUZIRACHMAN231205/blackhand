-- Migration: replace Supabase Auth with custom email-OTP + Google OAuth.
-- Run this once, manually, in the Supabase SQL editor after the project is back online.
-- Safe to re-run: every step is idempotent (IF NOT EXISTS / IF EXISTS / ON CONFLICT).

-- ─── 1. Identity table (replaces auth.users for app purposes) ─────────────
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  provider TEXT NOT NULL DEFAULT 'email', -- 'email' | 'google'
  created_at TIMESTAMPTZ DEFAULT now(),
  last_sign_in_at TIMESTAMPTZ
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- No policies: this table is only ever touched via the service-role key
-- from Route Handlers (app/api/auth/*, app/api/admin/*, app/api/profile).

-- ─── 2. Back-fill public.users, keeping the SAME ids ──────────────────────
-- Required so the FK swap in step 4 doesn't orphan any existing works/ratings/
-- comments. Two passes:
--   2a. Real data for every id that still exists in auth.users.
--   2b. Placeholder rows for any id referenced by works/work_ratings/work_comments
--       that has NO matching auth.users row (e.g. the auth user was deleted, or
--       auth.users got reset independently of the data tables — this happens if
--       the project was paused/restored). Without this pass the FK swap in step 4
--       fails with "violates foreign key constraint ... is not present in table users".
-- Both passes are no-ops on a fresh project with no existing data.

-- 2a. Real users from auth.users
INSERT INTO public.users (id, email, full_name, avatar_url, provider, created_at, last_sign_in_at)
SELECT
  id,
  email,
  raw_user_meta_data->>'full_name',
  raw_user_meta_data->>'avatar_url',
  COALESCE(raw_app_meta_data->>'provider', 'email'),
  created_at,
  last_sign_in_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2b. Placeholders for orphaned ids still referenced by existing data
INSERT INTO public.users (id, email, full_name, provider)
SELECT DISTINCT
  missing_id,
  missing_id::text || '@unknown.blackhand.local',
  'Unknown User',
  'email'
FROM (
  SELECT created_by AS missing_id FROM public.works
  UNION
  SELECT user_id FROM public.work_ratings
  UNION
  SELECT user_id FROM public.work_comments
) refs
WHERE missing_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = missing_id)
ON CONFLICT (id) DO NOTHING;

-- ─── 3. OTP codes (short-lived, service-role only) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON public.otp_codes(email);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
-- No policies: service-role only.

-- ─── 4. Swap FKs from auth.users to public.users ───────────────────────────
ALTER TABLE public.works
  DROP CONSTRAINT IF EXISTS works_created_by_fkey,
  ADD CONSTRAINT works_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.work_ratings
  DROP CONSTRAINT IF EXISTS work_ratings_user_id_fkey,
  ADD CONSTRAINT work_ratings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.work_comments
  DROP CONSTRAINT IF EXISTS work_comments_user_id_fkey,
  ADD CONSTRAINT work_comments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ─── 5. Widen public SELECT policies (anon key, no session needed) ────────
DROP POLICY IF EXISTS "Users can view published works" ON public.works;
CREATE POLICY "Public can view published works" ON public.works
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS "Users can view published work images" ON public.work_images;
CREATE POLICY "Public can view published work images" ON public.work_images
  FOR SELECT
  TO anon, authenticated
  USING (work_id IN (SELECT id FROM public.works WHERE is_published = true));

DROP POLICY IF EXISTS "Allow read access to all authenticated users for ratings" ON public.work_ratings;
CREATE POLICY "Public can view ratings" ON public.work_ratings
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow read access to all authenticated users for comments" ON public.work_comments;
CREATE POLICY "Public can view comments" ON public.work_comments
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ─── 6. Drop write policies that relied on Supabase Auth JWTs ─────────────
-- All INSERT/UPDATE/DELETE now goes exclusively through Route Handlers using
-- the service-role key (bypasses RLS; authorization enforced in app code).
-- These policies would silently never match a non-Supabase JWT anyway.
DROP POLICY IF EXISTS "Admins can view all works" ON public.works;
DROP POLICY IF EXISTS "Only admins can create works" ON public.works;
DROP POLICY IF EXISTS "Admins can update works" ON public.works;
DROP POLICY IF EXISTS "Admins can delete works" ON public.works;

DROP POLICY IF EXISTS "Admins can view all work images" ON public.work_images;
DROP POLICY IF EXISTS "Admins can manage work images" ON public.work_images;

DROP POLICY IF EXISTS "Allow insert/upsert access to rating creator" ON public.work_ratings;
DROP POLICY IF EXISTS "Allow update access to rating creator" ON public.work_ratings;
DROP POLICY IF EXISTS "Allow delete access to rating creator" ON public.work_ratings;

DROP POLICY IF EXISTS "Allow insert access to comment creator" ON public.work_comments;
DROP POLICY IF EXISTS "Allow delete access to comment creator or admin" ON public.work_comments;
