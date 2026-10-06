-- Adds an optional "compare at" price to products, so the shop can show a
-- struck-through original price next to a lower current price (sale badge),
-- the way dropdead.world does. Run once in the Supabase SQL editor.
--
-- A NULL value (the default for existing rows) means "not on sale" — the
-- storefront only shows the sale badge/strikethrough when
-- compare_at_price_idr is set and greater than price_idr.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS compare_at_price_idr INTEGER
    CHECK (compare_at_price_idr IS NULL OR compare_at_price_idr >= 0);
