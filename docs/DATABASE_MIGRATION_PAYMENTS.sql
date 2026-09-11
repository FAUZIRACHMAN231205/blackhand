-- Migration: album sales (Midtrans) + split preview/original storage.
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent).

-- ─── 1. Private bucket for the full-resolution originals ──────────────────
-- Public bucket `work-images` keeps only what any visitor may see:
--   * the featured image  -> clean, downscaled preview
--   * the other images    -> pre-blurred small preview (blur is baked into the
--                            file, never a CSS effect, so the sharp version is
--                            never sent to the browser before purchase)
INSERT INTO storage.buckets (id, name, public)
VALUES ('work-originals', 'work-originals', false)
ON CONFLICT (id) DO NOTHING;

-- ─── 2. Pricing on works ──────────────────────────────────────────────────
ALTER TABLE public.works
  ADD COLUMN IF NOT EXISTS price_idr INTEGER CHECK (price_idr IS NULL OR price_idr >= 0);

ALTER TABLE public.works
  ADD COLUMN IF NOT EXISTS is_for_sale BOOLEAN NOT NULL DEFAULT false;

-- ─── 3. Point each image at its private original ──────────────────────────
-- work_images.image_url keeps its meaning: the PUBLIC preview that is safe to
-- display. original_path is the object key inside the private bucket.
ALTER TABLE public.work_images
  ADD COLUMN IF NOT EXISTS original_path TEXT;

-- ─── 4. Orders ────────────────────────────────────────────────────────────
-- work_title and amount_idr are snapshots: an order must stay meaningful even
-- if the work is later renamed or repriced.
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE RESTRICT,
  work_title TEXT NOT NULL,
  amount_idr INTEGER NOT NULL CHECK (amount_idr >= 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded')),
  provider TEXT NOT NULL DEFAULT 'midtrans',
  provider_order_id TEXT NOT NULL UNIQUE,
  provider_transaction_id TEXT,
  payment_type TEXT,
  raw_notification JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_work_id ON public.orders(work_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- An album can only be owned once per buyer. Partial index still allows any
-- number of pending/failed attempts before a successful one.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_paid_order_per_user_work
  ON public.orders(user_id, work_id)
  WHERE status = 'paid';

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- No policies: orders are only ever read/written by Route Handlers using the
-- service-role key, exactly like users and otp_codes.
