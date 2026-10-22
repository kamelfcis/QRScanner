-- Mazen Store: dynamic product sizes (S/M/L/XL + custom) and order size snapshots
-- Version: 021
-- Apply on Mazen Supabase only (mokijxmoxfbahncsfpzb)

CREATE TABLE IF NOT EXISTS public.product_sizes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  code VARCHAR(32) NOT NULL,
  label_ar VARCHAR(255) NOT NULL,
  label_en VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  is_sold_out BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT product_sizes_price_check CHECK (price >= 0),
  CONSTRAINT product_sizes_code_unique UNIQUE (product_id, code)
);

CREATE INDEX IF NOT EXISTS idx_product_sizes_product_sort
  ON public.product_sizes (product_id, sort_order);

ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read enabled product_sizes" ON public.product_sizes;
CREATE POLICY "Public read enabled product_sizes"
  ON public.product_sizes FOR SELECT
  USING (is_enabled = true);

DROP POLICY IF EXISTS "Staff all product_sizes" ON public.product_sizes;
CREATE POLICY "Staff all product_sizes"
  ON public.product_sizes FOR ALL
  USING ((SELECT auth.uid()) IS NOT NULL);

GRANT SELECT ON public.product_sizes TO anon, authenticated;
GRANT ALL ON public.product_sizes TO authenticated;

-- Sold-out products stay visible on the public menu (badge + blocked add-to-cart)
DROP POLICY IF EXISTS "Public read products" ON public.products;
CREATE POLICY "Public read products"
  ON public.products FOR SELECT
  USING (true);

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'order_items'
  ) THEN
    ALTER TABLE public.order_items
      ADD COLUMN IF NOT EXISTS selected_size jsonb;
    EXECUTE $comment$
      COMMENT ON COLUMN public.order_items.selected_size IS
        'Snapshot { code, label_ar, label_en, price } at order time; do not join product_sizes for old orders.'
    $comment$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_product_sizes_updated_at ON public.product_sizes;
CREATE TRIGGER update_product_sizes_updated_at
  BEFORE UPDATE ON public.product_sizes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.product_sizes IS
  'Ecommerce size variants per product (S/M/L/XL or one custom code). Public reads enabled rows only.';
