-- AlTounsi checkout: InstaPay link and Vodafone Cash on delivery proofs.
-- Extends public.instapay_delivery_proofs. Does not rename the table.
-- Seeds restaurant settings keys only when they are missing.
-- Version: 021

ALTER TABLE public.instapay_delivery_proofs
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'instapay',
  ADD COLUMN IF NOT EXISTS prepaid_scope text NOT NULL DEFAULT 'shipping_only',
  ADD COLUMN IF NOT EXISTS products_total numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_due numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_on_delivery numeric(10,2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'instapay_delivery_proofs_payment_method_check'
  ) THEN
    ALTER TABLE public.instapay_delivery_proofs
      ADD CONSTRAINT instapay_delivery_proofs_payment_method_check
      CHECK (payment_method IN ('instapay', 'vodafone_cash'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'instapay_delivery_proofs_prepaid_scope_check'
  ) THEN
    ALTER TABLE public.instapay_delivery_proofs
      ADD CONSTRAINT instapay_delivery_proofs_prepaid_scope_check
      CHECK (prepaid_scope IN ('shipping_only', 'full'));
  END IF;
END $$;

COMMENT ON COLUMN public.instapay_delivery_proofs.payment_method IS
  'instapay or vodafone_cash. Chosen at ecommerce checkout.';
COMMENT ON COLUMN public.instapay_delivery_proofs.prepaid_scope IS
  'shipping_only transfers the delivery fee; full transfers products plus delivery.';
COMMENT ON COLUMN public.instapay_delivery_proofs.amount_due IS
  'Amount the customer must transfer now. Recomputed on the server.';
COMMENT ON COLUMN public.instapay_delivery_proofs.remaining_on_delivery IS
  'Cash still due to the courier. Zero when prepaid_scope is full.';

UPDATE public.settings
SET value = jsonb_set(
  jsonb_set(
    value,
    '{instapay_payment_url}',
    CASE
      WHEN value ? 'instapay_payment_url' THEN value->'instapay_payment_url'
      ELSE '""'::jsonb
    END,
    true
  ),
  '{vodafone_cash_number}',
  CASE
    WHEN value ? 'vodafone_cash_number' THEN value->'vodafone_cash_number'
    ELSE '""'::jsonb
  END,
  true
)
WHERE key = 'restaurant';
