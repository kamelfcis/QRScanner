-- Staff roles for dashboard access control (hettsamaka tier 3)
-- Version: 032
-- Date: 2026-09-17

CREATE TABLE IF NOT EXISTS public.staff_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'cashier')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.staff_profiles (user_id, role)
SELECT id, 'admin'
  FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read own profile" ON public.staff_profiles;
CREATE POLICY "Staff read own profile"
  ON public.staff_profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admin read all staff profiles" ON public.staff_profiles;
CREATE POLICY "Admin read all staff profiles"
  ON public.staff_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.user_id = (select auth.uid()) AND sp.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin manage staff profiles" ON public.staff_profiles;
CREATE POLICY "Admin manage staff profiles"
  ON public.staff_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.user_id = (select auth.uid()) AND sp.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin update staff profiles" ON public.staff_profiles;
CREATE POLICY "Admin update staff profiles"
  ON public.staff_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.user_id = (select auth.uid()) AND sp.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.user_id = (select auth.uid()) AND sp.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin delete staff profiles" ON public.staff_profiles;
CREATE POLICY "Admin delete staff profiles"
  ON public.staff_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.user_id = (select auth.uid()) AND sp.role = 'admin'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_profiles TO authenticated;
