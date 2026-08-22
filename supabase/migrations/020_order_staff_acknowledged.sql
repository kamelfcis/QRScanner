-- Kitchen order board: staff acknowledgement for persistent ring alerts
-- Version: 020
-- Date: 2026-08-15

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS staff_acknowledged_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_orders_new_unacknowledged
  ON public.orders (status, staff_acknowledged_at)
  WHERE status = 'new';

COMMENT ON COLUMN public.orders.staff_acknowledged_at IS
  'When kitchen staff acknowledged a new order (stops ring alert).';
