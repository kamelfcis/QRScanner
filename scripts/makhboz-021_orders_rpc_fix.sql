-- Makhboz: columns referenced by place_staff_order / place_customer_order (ala-keefak RPCs)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS name_fr VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name_nl VARCHAR(255),
  ADD COLUMN IF NOT EXISTS has_size_options BOOLEAN NOT NULL DEFAULT false;

-- Products with product_sizes rows should expose size choice in staff POS
UPDATE public.products p
SET has_size_options = true
WHERE EXISTS (
  SELECT 1 FROM public.product_sizes ps
  WHERE ps.product_id = p.id AND ps.is_enabled = true
);

COMMENT ON COLUMN public.products.has_size_options IS
  'When true, staff/customer order RPCs use dining_price (small) and takeaway_price (large).';
