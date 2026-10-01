-- Delivery locations with zone pricing (Cairo areas for ecommerce stores)
-- Version: 015
-- Date: 2026-10-01

CREATE TABLE IF NOT EXISTS public.delivery_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  name_fr VARCHAR(255),
  name_nl VARCHAR(255),
  delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_locations_active_sort
  ON public.delivery_locations (is_active, sort_order);

DROP TRIGGER IF EXISTS update_delivery_locations_updated_at ON public.delivery_locations;
CREATE TRIGGER update_delivery_locations_updated_at
  BEFORE UPDATE ON public.delivery_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.delivery_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active delivery_locations" ON public.delivery_locations;
CREATE POLICY "Public read active delivery_locations"
  ON public.delivery_locations FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Staff select delivery_locations" ON public.delivery_locations;
CREATE POLICY "Staff select delivery_locations"
  ON public.delivery_locations FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Staff insert delivery_locations" ON public.delivery_locations;
CREATE POLICY "Staff insert delivery_locations"
  ON public.delivery_locations FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Staff update delivery_locations" ON public.delivery_locations;
CREATE POLICY "Staff update delivery_locations"
  ON public.delivery_locations FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Staff delete delivery_locations" ON public.delivery_locations;
CREATE POLICY "Staff delete delivery_locations"
  ON public.delivery_locations FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

GRANT SELECT ON public.delivery_locations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_locations TO authenticated;

COMMENT ON TABLE public.delivery_locations IS 'Admin-managed delivery zones with per-location fees. No seed data — admins add Cairo areas via dashboard.';
