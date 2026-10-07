-- Ala Keefak staff username login
-- Version: 043
-- Date: 2026-10-07
-- Apply only on Ala Keefak (pytmkruoyyhxfktnkpuu).

ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS username text;

ALTER TABLE public.staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_username_format_check;
ALTER TABLE public.staff_profiles
  ADD CONSTRAINT staff_profiles_username_format_check
  CHECK (
    username IS NULL
    OR username = ''
    OR username ~ '^[a-z0-9._-]{3,32}$'
  );

CREATE UNIQUE INDEX IF NOT EXISTS staff_profiles_username_lower_idx
  ON public.staff_profiles (lower(username))
  WHERE username IS NOT NULL AND username <> '';

CREATE OR REPLACE FUNCTION public.resolve_staff_login_email(p_identifier text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT CASE
    WHEN p_identifier ~* '^[^@]+@[^@]+\.[^@]+$'
      THEN lower(trim(p_identifier))
    ELSE (
      SELECT u.email
      FROM public.staff_profiles sp
      JOIN auth.users u ON u.id = sp.user_id
      WHERE lower(sp.username) = lower(trim(p_identifier))
        AND sp.is_active = true
      LIMIT 1
    )
  END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_staff_login_email(text) TO anon, authenticated;
