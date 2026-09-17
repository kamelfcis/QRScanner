-- Fix staff_profiles RLS infinite recursion (500 on SELECT)
-- Version: 033
-- Date: 2026-09-17
--
-- Root cause: admin policies queried staff_profiles inside staff_profiles RLS checks.

CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.staff_profiles
     WHERE user_id = (SELECT auth.uid())
       AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_staff_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff_admin() TO authenticated;

-- Backfill any auth users missing a staff profile (e.g. created after migration 032).
INSERT INTO public.staff_profiles (user_id, role)
SELECT id, 'admin'
  FROM auth.users u
 WHERE NOT EXISTS (
   SELECT 1 FROM public.staff_profiles sp WHERE sp.user_id = u.id
 )
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.ensure_staff_profile_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.staff_profiles (user_id, role)
  VALUES (NEW.id, 'admin')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_staff_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_staff_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_staff_profile_on_signup();

DROP POLICY IF EXISTS "Admin read all staff profiles" ON public.staff_profiles;
CREATE POLICY "Admin read all staff profiles"
  ON public.staff_profiles FOR SELECT
  TO authenticated
  USING (public.is_staff_admin());

DROP POLICY IF EXISTS "Admin manage staff profiles" ON public.staff_profiles;
CREATE POLICY "Admin manage staff profiles"
  ON public.staff_profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff_admin());

DROP POLICY IF EXISTS "Admin update staff profiles" ON public.staff_profiles;
CREATE POLICY "Admin update staff profiles"
  ON public.staff_profiles FOR UPDATE
  TO authenticated
  USING (public.is_staff_admin())
  WITH CHECK (public.is_staff_admin());

DROP POLICY IF EXISTS "Admin delete staff profiles" ON public.staff_profiles;
CREATE POLICY "Admin delete staff profiles"
  ON public.staff_profiles FOR DELETE
  TO authenticated
  USING (public.is_staff_admin());
