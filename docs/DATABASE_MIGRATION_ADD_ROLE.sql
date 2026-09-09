-- Migration: Add 'role' column to public.users
-- Run this ONCE in the Supabase SQL Editor.
-- Safe to re-run: idempotent (DO adds column only if missing, UPDATE uses WHERE).

-- ─── 1. Add the role column ────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'users'
      AND column_name  = 'role'
  ) THEN
    ALTER TABLE public.users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
  END IF;
END $$;

-- ─── 2. Promote existing admin accounts ────────────────────────────────────
UPDATE public.users
SET role = 'admin'
WHERE email IN (
  'manyungalang@gmail.com',
  'fauzirachman10091985@gmail.com'
);

-- ─── 3. Optional: index for fast admin lookups ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
