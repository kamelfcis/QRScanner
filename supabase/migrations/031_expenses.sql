-- Simple expenses ledger (hettsamaka tier 3)
-- Version: 031
-- Date: 2026-09-17

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  category TEXT NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses (expense_date DESC);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff select expenses" ON public.expenses;
CREATE POLICY "Staff select expenses"
  ON public.expenses FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Staff insert expenses" ON public.expenses;
CREATE POLICY "Staff insert expenses"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Staff update expenses" ON public.expenses;
CREATE POLICY "Staff update expenses"
  ON public.expenses FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Staff delete expenses" ON public.expenses;
CREATE POLICY "Staff delete expenses"
  ON public.expenses FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
