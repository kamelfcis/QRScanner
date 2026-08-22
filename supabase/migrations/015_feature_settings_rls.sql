-- Warda Shamya Digital Restaurant Platform
-- Lock settings key='features' so restaurant admins cannot write it
-- Version: 015
-- Date: 2026-08-14

-- Public SELECT stays ("Public read settings") so the dashboard can hide Generate/Enhance.
-- Service role used by Engaz Admin bypasses RLS.

DROP POLICY IF EXISTS "Admin all settings" ON public.settings;
DROP POLICY IF EXISTS "Admin insert settings" ON public.settings;
DROP POLICY IF EXISTS "Admin update settings" ON public.settings;
DROP POLICY IF EXISTS "Admin delete settings" ON public.settings;

CREATE POLICY "Admin insert settings"
  ON public.settings FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL AND key <> 'features');

CREATE POLICY "Admin update settings"
  ON public.settings FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND key <> 'features')
  WITH CHECK ((select auth.uid()) IS NOT NULL AND key <> 'features');

CREATE POLICY "Admin delete settings"
  ON public.settings FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL AND key <> 'features');
