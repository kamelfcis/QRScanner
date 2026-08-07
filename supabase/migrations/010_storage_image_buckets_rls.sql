-- Warda Shamya Digital Restaurant Platform
-- Storage bucket RLS for image uploads (logos, covers, categories, products, etc.)
-- Version: 010
-- Date: 2025-08-05

-- Ensure buckets exist (idempotent; buckets may already be created in dashboard)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('logos', 'logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('covers', 'covers', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('categories', 'categories', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('products', 'products', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('assets', 'assets', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('qr', 'qr', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('pdfs', 'pdfs', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- logos
CREATE POLICY "Public read logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

CREATE POLICY "Admin upload logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin update logos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin delete logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'logos' AND auth.uid() IS NOT NULL);

-- covers
CREATE POLICY "Public read covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'covers');

CREATE POLICY "Admin upload covers"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'covers' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin update covers"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'covers' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin delete covers"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'covers' AND auth.uid() IS NOT NULL);

-- categories
CREATE POLICY "Public read categories"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'categories');

CREATE POLICY "Admin upload categories"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'categories' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin update categories"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'categories' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin delete categories"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'categories' AND auth.uid() IS NOT NULL);

-- products
CREATE POLICY "Public read products"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

CREATE POLICY "Admin upload products"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'products' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin update products"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'products' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin delete products"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'products' AND auth.uid() IS NOT NULL);

-- assets
CREATE POLICY "Public read assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assets');

CREATE POLICY "Admin upload assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin update assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin delete assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'assets' AND auth.uid() IS NOT NULL);

-- qr
CREATE POLICY "Public read qr"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'qr');

CREATE POLICY "Admin upload qr"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'qr' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin update qr"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'qr' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin delete qr"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'qr' AND auth.uid() IS NOT NULL);

-- pdfs (private bucket)
CREATE POLICY "Admin read pdfs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pdfs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin upload pdfs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pdfs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin update pdfs"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'pdfs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin delete pdfs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'pdfs' AND auth.uid() IS NOT NULL);
