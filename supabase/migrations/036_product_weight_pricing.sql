-- Product weight-based pricing (hettsamaka tenant)
-- Version: 036
-- Date: 2026-09-19

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_per_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS weight_options_g INTEGER[];
