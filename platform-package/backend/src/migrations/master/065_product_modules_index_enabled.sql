-- Phase 1: index for "enabled product + enabled modules" filter (Phase 2 mount/catalog filter)
-- Safe: index only, no schema change.
CREATE INDEX IF NOT EXISTS idx_product_modules_enabled
  ON public.product_modules (product_key, enabled);
