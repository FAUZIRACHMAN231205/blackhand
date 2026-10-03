-- Migration: exclusive (one-buyer) artwork sales + merchandise shop.
-- Run once in the Supabase SQL editor, after DATABASE_MIGRATION_PAYMENTS.sql.
-- Safe to re-run (idempotent).
--
-- What changes:
--   * Every artwork image is shown clean to everyone. There is no paywall blur
--     any more; the full-resolution originals stay private and are the buyer's
--     download. (Run `node --env-file=.env.local scripts/unblur-previews.mjs`
--     once to rebuild the previews that were stored blurred.)
--   * A work is sold to exactly one buyer. While someone checks out, the work is
--     reserved for them; once paid it is marked sold — still visible to all, but
--     no one else can buy or download it.
--   * A merchandise shop: products with stock, direct checkout via Midtrans with
--     a flat shipping fee the admin sets, and order fulfilment in the admin panel.
--
-- All state changes that involve money run inside the functions below, so each
-- is a single transaction: two buyers can never both end up owning one work,
-- and stock can never go negative.

-- ─── 1. Works: sold + reservation ──────────────────────────────────────────
ALTER TABLE public.works ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ;
-- While in the future, someone is paying for this work and nobody else may
-- start a checkout. A timestamp, not a user id: works are publicly readable.
ALTER TABLE public.works ADD COLUMN IF NOT EXISTS reserved_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_works_sold_at ON public.works(sold_at);

-- ─── 2. Orders: reservation window, reusable Snap token, needs_refund ─────
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS snap_token TEXT;

-- needs_refund: money arrived for a work someone else already owns (or for
-- merchandise that ran out). It is never fulfilled; the admin refunds it.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded', 'needs_refund'));

-- Works bought before this migration count as sold to their first buyer.
UPDATE public.works w
   SET sold_at = o.first_paid
  FROM (
    SELECT work_id, min(COALESCE(paid_at, created_at)) AS first_paid
      FROM public.orders
     WHERE status = 'paid'
     GROUP BY work_id
  ) o
 WHERE w.id = o.work_id AND w.sold_at IS NULL;

-- The hard guarantee behind "one buyer per work". Creating it fails if an album
-- was already sold to several buyers; resolve those rows first.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_paid_order_per_work
  ON public.orders(work_id)
  WHERE status = 'paid';

CREATE INDEX IF NOT EXISTS idx_orders_pending_expiry
  ON public.orders(expires_at)
  WHERE status = 'pending';

-- ─── 3. Products ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_idr INTEGER NOT NULL CHECK (price_idr >= 0),
  -- Available to buy right now: units in an unpaid checkout are already taken off.
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_published BOOLEAN NOT NULL DEFAULT true,
  cover_image_url TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_published ON public.products(is_published, created_at DESC);

CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id, display_order);

-- ─── 4. Shop settings (a single row) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  shipping_fee_idr INTEGER NOT NULL DEFAULT 0 CHECK (shipping_fee_idr >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.shop_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ─── 5. Product orders ────────────────────────────────────────────────────
-- Name, price and fee are snapshots: an order keeps meaning what was paid even
-- if the product is later edited or deleted.
CREATE TABLE IF NOT EXISTS public.product_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  unit_price_idr INTEGER NOT NULL CHECK (unit_price_idr >= 0),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  subtotal_idr INTEGER NOT NULL CHECK (subtotal_idr >= 0),
  shipping_fee_idr INTEGER NOT NULL CHECK (shipping_fee_idr >= 0),
  total_idr INTEGER NOT NULL CHECK (total_idr >= 0),

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded', 'needs_refund')),
  fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled'
    CHECK (fulfillment_status IN ('unfulfilled', 'processing', 'shipped', 'completed', 'cancelled')),
  -- True while this order holds units taken off products.stock.
  stock_reserved BOOLEAN NOT NULL DEFAULT true,

  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_postal_code TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  courier TEXT,
  tracking_number TEXT,

  provider TEXT NOT NULL DEFAULT 'midtrans',
  provider_order_id TEXT NOT NULL UNIQUE,
  provider_transaction_id TEXT,
  payment_type TEXT,
  raw_notification JSONB,
  snap_token TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_orders_user ON public.product_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_orders_status ON public.product_orders(status, fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_product_orders_pending_expiry
  ON public.product_orders(expires_at)
  WHERE status = 'pending';

-- ─── 6. Row level security ────────────────────────────────────────────────
-- Catalogue data is public (read with the anon key, like works). Orders and
-- settings writes go through Route Handlers with the service-role key only.
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published products" ON public.products;
CREATE POLICY "Public can view published products" ON public.products
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS "Public can view published product images" ON public.product_images;
CREATE POLICY "Public can view published product images" ON public.product_images
  FOR SELECT TO anon, authenticated
  USING (product_id IN (SELECT id FROM public.products WHERE is_published = true));

DROP POLICY IF EXISTS "Public can view shop settings" ON public.shop_settings;
CREATE POLICY "Public can view shop settings" ON public.shop_settings
  FOR SELECT TO anon, authenticated
  USING (true);

-- ─── 7. Storage: product photos (public) ──────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- ─── 8. Functions ─────────────────────────────────────────────────────────

-- Reserve a work for one buyer and open their pending order, atomically.
-- Returns the new order, or no row when the work is sold, not for sale, or
-- reserved by someone else. The reservation lasts the payment window plus a
-- grace period, so a payment made at the last second still settles before
-- anyone else can start. The holder may start over once their own payment
-- window has closed.
CREATE OR REPLACE FUNCTION public.claim_work_for_checkout(
  p_work_id UUID,
  p_user_id UUID,
  p_provider_order_id TEXT,
  p_pay_minutes INTEGER,
  p_grace_minutes INTEGER
)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_until TIMESTAMPTZ := now() + make_interval(mins => p_pay_minutes + p_grace_minutes);
  v_title TEXT;
  v_price INTEGER;
BEGIN
  UPDATE works w
     SET reserved_until = v_until
   WHERE w.id = p_work_id
     AND w.is_published
     AND w.is_for_sale
     AND w.price_idr IS NOT NULL
     AND w.sold_at IS NULL
     AND (
       w.reserved_until IS NULL
       OR w.reserved_until < now()
       OR EXISTS (
         SELECT 1 FROM orders o
          WHERE o.work_id = w.id
            AND o.user_id = p_user_id
            AND o.status = 'pending'
            AND o.expires_at = w.reserved_until
            AND o.created_at + make_interval(mins => p_pay_minutes) < now()
       )
     )
  RETURNING w.title, w.price_idr INTO v_title, v_price;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- The buyer's earlier attempts at this work are superseded.
  UPDATE orders
     SET status = 'expired'
   WHERE work_id = p_work_id AND user_id = p_user_id AND status = 'pending';

  RETURN QUERY
  INSERT INTO orders (user_id, work_id, work_title, amount_idr, status, provider, provider_order_id, expires_at)
  VALUES (p_user_id, p_work_id, v_title, v_price, 'pending', 'midtrans', p_provider_order_id, v_until)
  RETURNING *;
END;
$$;

-- Apply a verified Midtrans notification to an artwork order.
-- Returns what happened: paid | needs_refund | refunded | unchanged | not_found
-- or the new status (pending/failed/expired/cancelled).
CREATE OR REPLACE FUNCTION public.apply_work_order_notification(
  p_order_id UUID,
  p_status TEXT,
  p_transaction_id TEXT,
  p_payment_type TEXT,
  p_raw JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_claimed UUID;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  -- Paid is final, except for an explicit refund — which hands the work back
  -- so it can be sold again.
  IF v_order.status = 'paid' THEN
    IF p_status <> 'refunded' THEN
      RETURN 'unchanged';
    END IF;
    UPDATE orders SET status = 'refunded', raw_notification = p_raw WHERE id = p_order_id;
    UPDATE works SET sold_at = NULL WHERE id = v_order.work_id;
    RETURN 'refunded';
  END IF;

  -- Money that could not be honoured is settled by hand; only a refund moves it.
  IF v_order.status IN ('needs_refund', 'refunded') THEN
    IF p_status = 'refunded' AND v_order.status <> 'refunded' THEN
      UPDATE orders SET status = 'refunded', raw_notification = p_raw WHERE id = p_order_id;
      RETURN 'refunded';
    END IF;
    RETURN 'unchanged';
  END IF;

  IF p_status = 'paid' THEN
    -- Whoever pays first owns the work. A late payment (e.g. for a checkout
    -- that had already lapsed) still wins if the work is unsold.
    UPDATE works
       SET sold_at = now(), reserved_until = NULL
     WHERE id = v_order.work_id AND sold_at IS NULL
    RETURNING id INTO v_claimed;

    UPDATE orders
       SET status = CASE WHEN v_claimed IS NULL THEN 'needs_refund' ELSE 'paid' END,
           provider_transaction_id = COALESCE(p_transaction_id, provider_transaction_id),
           payment_type = COALESCE(p_payment_type, payment_type),
           raw_notification = p_raw,
           paid_at = now()
     WHERE id = p_order_id;

    RETURN CASE WHEN v_claimed IS NULL THEN 'needs_refund' ELSE 'paid' END;
  END IF;

  UPDATE orders
     SET status = p_status,
         provider_transaction_id = COALESCE(p_transaction_id, provider_transaction_id),
         payment_type = COALESCE(p_payment_type, payment_type),
         raw_notification = p_raw
   WHERE id = p_order_id;

  IF p_status IN ('failed', 'expired', 'cancelled', 'refunded') THEN
    -- Release the work, but only if this order is still the one holding it.
    UPDATE works
       SET reserved_until = NULL
     WHERE id = v_order.work_id
       AND sold_at IS NULL
       AND reserved_until = v_order.expires_at;
  END IF;

  RETURN p_status;
END;
$$;

-- Take stock for one product and open a pending order, atomically. Returns the
-- order, or no row when the product is unpublished or has too little stock.
CREATE OR REPLACE FUNCTION public.create_product_order(
  p_user_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_provider_order_id TEXT,
  p_recipient_name TEXT,
  p_recipient_phone TEXT,
  p_shipping_address TEXT,
  p_shipping_city TEXT,
  p_shipping_postal_code TEXT,
  p_notes TEXT,
  p_pay_minutes INTEGER,
  p_grace_minutes INTEGER
)
RETURNS SETOF public.product_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product products%ROWTYPE;
  v_fee INTEGER;
BEGIN
  UPDATE products
     SET stock = stock - p_quantity, updated_at = now()
   WHERE id = p_product_id AND is_published AND stock >= p_quantity
  RETURNING * INTO v_product;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT shipping_fee_idr INTO v_fee FROM shop_settings WHERE id = 1;
  v_fee := COALESCE(v_fee, 0);

  RETURN QUERY
  INSERT INTO product_orders (
    user_id, product_id, product_name, unit_price_idr, quantity, subtotal_idr,
    shipping_fee_idr, total_idr, status, stock_reserved,
    recipient_name, recipient_phone, shipping_address, shipping_city,
    shipping_postal_code, notes, provider, provider_order_id, expires_at
  )
  VALUES (
    p_user_id, v_product.id, v_product.name, v_product.price_idr, p_quantity,
    v_product.price_idr * p_quantity, v_fee, v_product.price_idr * p_quantity + v_fee,
    'pending', true,
    p_recipient_name, p_recipient_phone, p_shipping_address, p_shipping_city,
    p_shipping_postal_code, COALESCE(p_notes, ''), 'midtrans', p_provider_order_id,
    now() + make_interval(mins => p_pay_minutes + p_grace_minutes)
  )
  RETURNING *;
END;
$$;

-- Apply a verified Midtrans notification to a merchandise order.
-- Returns: paid | needs_refund | refunded | unchanged | not_found | new status.
CREATE OR REPLACE FUNCTION public.apply_product_order_notification(
  p_order_id UUID,
  p_status TEXT,
  p_transaction_id TEXT,
  p_payment_type TEXT,
  p_raw JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order product_orders%ROWTYPE;
  v_has_stock BOOLEAN;
BEGIN
  SELECT * INTO v_order FROM product_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  IF v_order.status = 'paid' THEN
    IF p_status <> 'refunded' THEN
      RETURN 'unchanged';
    END IF;
    -- Goods may already be on their way; putting them back on the shelf is the
    -- admin's call, not the payment provider's.
    UPDATE product_orders
       SET status = 'refunded', raw_notification = p_raw, updated_at = now()
     WHERE id = p_order_id;
    RETURN 'refunded';
  END IF;

  IF v_order.status IN ('needs_refund', 'refunded') THEN
    IF p_status = 'refunded' AND v_order.status <> 'refunded' THEN
      UPDATE product_orders
         SET status = 'refunded', raw_notification = p_raw, updated_at = now()
       WHERE id = p_order_id;
      RETURN 'refunded';
    END IF;
    RETURN 'unchanged';
  END IF;

  IF p_status = 'paid' THEN
    v_has_stock := v_order.stock_reserved;
    IF NOT v_has_stock THEN
      -- The checkout lapsed and its units went back on the shelf; take them
      -- again if they are still there.
      UPDATE products
         SET stock = stock - v_order.quantity, updated_at = now()
       WHERE id = v_order.product_id AND stock >= v_order.quantity;
      v_has_stock := FOUND;
    END IF;

    UPDATE product_orders
       SET status = CASE WHEN v_has_stock THEN 'paid' ELSE 'needs_refund' END,
           stock_reserved = v_has_stock,
           provider_transaction_id = COALESCE(p_transaction_id, provider_transaction_id),
           payment_type = COALESCE(p_payment_type, payment_type),
           raw_notification = p_raw,
           paid_at = now(),
           updated_at = now()
     WHERE id = p_order_id;

    RETURN CASE WHEN v_has_stock THEN 'paid' ELSE 'needs_refund' END;
  END IF;

  UPDATE product_orders
     SET status = p_status,
         stock_reserved = CASE
           WHEN p_status IN ('failed', 'expired', 'cancelled', 'refunded') THEN false
           ELSE stock_reserved
         END,
         provider_transaction_id = COALESCE(p_transaction_id, provider_transaction_id),
         payment_type = COALESCE(p_payment_type, payment_type),
         raw_notification = p_raw,
         updated_at = now()
   WHERE id = p_order_id;

  IF p_status IN ('failed', 'expired', 'cancelled', 'refunded') AND v_order.stock_reserved THEN
    UPDATE products
       SET stock = stock + v_order.quantity, updated_at = now()
     WHERE id = v_order.product_id;
  END IF;

  RETURN p_status;
END;
$$;

-- Close checkouts whose payment window (plus grace) has passed: merchandise
-- stock goes back on the shelf and works are free again. The webhook normally
-- does this, but it cannot reach a development machine, so the app also calls
-- this before it reads stock or orders.
CREATE OR REPLACE FUNCTION public.expire_stale_orders()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH lapsed AS (
    UPDATE product_orders
       SET status = 'expired', stock_reserved = false, updated_at = now()
     WHERE status = 'pending' AND stock_reserved AND expires_at < now()
    RETURNING product_id, quantity
  ),
  returned AS (
    SELECT product_id, sum(quantity)::INTEGER AS quantity
      FROM lapsed
     WHERE product_id IS NOT NULL
     GROUP BY product_id
  )
  UPDATE products p
     SET stock = p.stock + r.quantity, updated_at = now()
    FROM returned r
   WHERE p.id = r.product_id;

  UPDATE orders
     SET status = 'expired'
   WHERE status = 'pending' AND expires_at < now();
$$;

-- Admin cancels a paid merchandise order before it ships: its units go back on
-- the shelf. The refund itself is made by hand in the Midtrans dashboard.
CREATE OR REPLACE FUNCTION public.cancel_product_order_fulfillment(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order product_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM product_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND
     OR v_order.status <> 'paid'
     OR v_order.fulfillment_status NOT IN ('unfulfilled', 'processing') THEN
    RETURN false;
  END IF;

  UPDATE product_orders
     SET fulfillment_status = 'cancelled', stock_reserved = false, updated_at = now()
   WHERE id = p_order_id;

  IF v_order.stock_reserved THEN
    UPDATE products
       SET stock = stock + v_order.quantity, updated_at = now()
     WHERE id = v_order.product_id;
  END IF;

  RETURN true;
END;
$$;

-- Only the server (service role) may call these.
REVOKE ALL ON FUNCTION public.claim_work_for_checkout(UUID, UUID, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_work_order_notification(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_product_order(UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_product_order_notification(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_stale_orders() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_product_order_fulfillment(UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_work_for_checkout(UUID, UUID, TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_work_order_notification(UUID, TEXT, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_product_order(UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_product_order_notification(UUID, TEXT, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_orders() TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_product_order_fulfillment(UUID) TO service_role;

-- Let the API see the new tables and functions straight away.
NOTIFY pgrst, 'reload schema';
