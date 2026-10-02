-- InstaPay delivery fee proof queue (ecommerce stores)
-- Version: 017
-- Date: 2026-10-02

CREATE TABLE IF NOT EXISTS public.instapay_delivery_proofs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_ref VARCHAR(32) NOT NULL UNIQUE,
  customer_name VARCHAR(255) NOT NULL DEFAULT '',
  customer_phone VARCHAR(50),
  delivery_location_id UUID REFERENCES public.delivery_locations(id),
  delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  proof_reference VARCHAR(255),
  screenshot_url TEXT,
  amount_note VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'rejected')),
  whatsapp_sent_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instapay_delivery_proofs_status_created
  ON public.instapay_delivery_proofs (status, created_at DESC);

ALTER TABLE public.instapay_delivery_proofs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff select instapay_delivery_proofs" ON public.instapay_delivery_proofs;
CREATE POLICY "Staff select instapay_delivery_proofs"
  ON public.instapay_delivery_proofs FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Staff update instapay_delivery_proofs" ON public.instapay_delivery_proofs;
CREATE POLICY "Staff update instapay_delivery_proofs"
  ON public.instapay_delivery_proofs FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

GRANT SELECT, UPDATE ON public.instapay_delivery_proofs TO authenticated;

COMMENT ON TABLE public.instapay_delivery_proofs IS
  'Customer InstaPay delivery-fee proofs awaiting admin verification. Inserts via service-role API only.';

-- Storage bucket for payment screenshots (upload via API service role)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'instapay-proofs',
  'instapay-proofs',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read instapay-proofs" ON storage.objects;
CREATE POLICY "Public read instapay-proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'instapay-proofs');

DROP POLICY IF EXISTS "Admin read instapay-proofs" ON storage.objects;
CREATE POLICY "Admin read instapay-proofs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'instapay-proofs' AND (select auth.uid()) IS NOT NULL);
