-- Optional Small / Large product sizes
-- Version: 016
-- Date: 2026-08-14

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS has_size_options BOOLEAN NOT NULL DEFAULT false;

-- Auto-enable for products that already have two different prices (Doctor Burger menu sync)
UPDATE public.products
SET has_size_options = true
WHERE dining_price IS DISTINCT FROM takeaway_price;
