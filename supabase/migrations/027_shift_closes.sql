-- Shift close snapshots for daily ops handoff
-- Version: 027
-- Date: 2026-09-17

CREATE TABLE IF NOT EXISTS public.shift_closes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  snapshot JSONB NOT NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_shift_closes_closed_at ON public.shift_closes (closed_at DESC);

ALTER TABLE public.shift_closes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff select shift_closes" ON public.shift_closes;
CREATE POLICY "Staff select shift_closes"
  ON public.shift_closes FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Staff insert shift_closes" ON public.shift_closes;
CREATE POLICY "Staff insert shift_closes"
  ON public.shift_closes FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

GRANT SELECT, INSERT ON public.shift_closes TO authenticated;
