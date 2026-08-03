-- Warda Shamya Digital Restaurant Platform
-- Row Level Security Policies
-- Version: 002
-- Date: 2025-08-03

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PUBLIC READ ACCESS (menu data visible to everyone)
-- ============================================================
CREATE POLICY "Public read categories"
  ON public.categories FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Public read subcategories"
  ON public.subcategories FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Public read products"
  ON public.products FOR SELECT
  USING (is_available = true);

CREATE POLICY "Public read gallery"
  ON public.gallery FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Public read settings"
  ON public.settings FOR SELECT
  USING (true);

CREATE POLICY "Public read offers"
  ON public.offers FOR SELECT
  USING (
    is_active = true
    AND (start_date IS NULL OR start_date <= now())
    AND (end_date IS NULL OR end_date >= now())
  );

-- ============================================================
-- ADMIN WRITE ACCESS (authenticated users only)
-- ============================================================
CREATE POLICY "Admin all categories"
  ON public.categories FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin all subcategories"
  ON public.subcategories FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin all products"
  ON public.products FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin all product_gallery"
  ON public.product_gallery FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin all offers"
  ON public.offers FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin all qr_codes"
  ON public.qr_codes FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin all gallery"
  ON public.gallery FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin all settings"
  ON public.settings FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- ANALYTICS: public insert, admin read
-- ============================================================
CREATE POLICY "Public insert analytics"
  ON public.analytics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin read analytics"
  ON public.analytics FOR SELECT
  USING (auth.uid() IS NOT NULL);
