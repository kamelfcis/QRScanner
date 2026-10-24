-- Mazen Store: public catalog can read product gallery rows
-- Version: 023
-- Apply on the Mazen database only

DROP POLICY IF EXISTS "Public read product_gallery" ON public.product_gallery;
CREATE POLICY "Public read product_gallery"
  ON public.product_gallery FOR SELECT
  TO public
  USING (true);
