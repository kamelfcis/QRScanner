-- Mazen Store: optional product stock count.
-- NULL means unlimited. No default of 0. Orders are not changed here.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_qty INTEGER NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND conname = 'products_stock_qty_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_stock_qty_check
      CHECK (stock_qty IS NULL OR stock_qty >= 0);
  END IF;
END $$;
