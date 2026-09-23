-- Daily ops: register payment close, void lines/orders, shift guard
-- Version: 037
-- Date: 2026-09-23
-- Ala Keefak + Hettsamaka daily ops (staff RPCs only for payment/void)

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20),
  ADD COLUMN IF NOT EXISTS amount_received NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS change_due NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS void_reason TEXT;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check CHECK (
    payment_method IS NULL OR payment_method IN ('cash', 'card', 'instapay')
  );

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS void_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_table_open_dine_in
  ON public.orders (table_number, created_at DESC)
  WHERE dining_mode = 'dining'
    AND status NOT IN ('completed', 'cancelled')
    AND table_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_paid_at
  ON public.orders (paid_at DESC)
  WHERE paid_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.assert_order_not_in_closed_shift(p_order_created_at timestamptz)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.shift_closes sc
    WHERE p_order_created_at >= sc.period_start
      AND p_order_created_at <= sc.period_end
  ) THEN
    RAISE EXCEPTION 'shift_closed';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_order_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_bypass boolean := current_setting('warda.order_rpc_bypass', true) = '1';
BEGIN
  NEW.id := OLD.id;
  NEW.order_number := OLD.order_number;
  NEW.dining_mode := OLD.dining_mode;
  NEW.fulfillment_type := OLD.fulfillment_type;
  NEW.table_number := OLD.table_number;
  NEW.customer_name := OLD.customer_name;
  NEW.customer_phone := OLD.customer_phone;
  NEW.delivery_address := OLD.delivery_address;
  NEW.delivery_location_id := OLD.delivery_location_id;
  NEW.notes := OLD.notes;
  NEW.subtotal := OLD.subtotal;
  NEW.tax := OLD.tax;
  NEW.service := OLD.service;
  NEW.discount_amount := OLD.discount_amount;
  NEW.coupon_id := OLD.coupon_id;
  NEW.coupon_code := OLD.coupon_code;
  NEW.currency := OLD.currency;
  NEW.locale := OLD.locale;
  NEW.created_at := OLD.created_at;

  IF v_bypass THEN
    IF NEW.payment_method IS NOT NULL THEN
      NEW.payment_method := lower(btrim(NEW.payment_method));
    END IF;
    IF NEW.amount_received IS NOT NULL THEN
      NEW.amount_received := round(greatest(COALESCE(NEW.amount_received, 0), 0), 2);
    END IF;
    IF NEW.change_due IS NOT NULL THEN
      NEW.change_due := round(greatest(COALESCE(NEW.change_due, 0), 0), 2);
    END IF;
  ELSE
    NEW.payment_method := OLD.payment_method;
    NEW.amount_received := OLD.amount_received;
    NEW.change_due := OLD.change_due;
    NEW.paid_at := OLD.paid_at;
    NEW.void_reason := OLD.void_reason;
  END IF;

  IF NEW.delivery_fee IS DISTINCT FROM OLD.delivery_fee THEN
    NEW.delivery_fee := round(greatest(least(COALESCE(NEW.delivery_fee, 0), 99999.99), 0), 2);
    NEW.total := round(
      OLD.subtotal - OLD.discount_amount + OLD.tax + OLD.service + NEW.delivery_fee,
      2
    );
  ELSE
    NEW.delivery_fee := OLD.delivery_fee;
    IF NOT v_bypass OR NEW.total IS NOT DISTINCT FROM OLD.total THEN
      NEW.total := OLD.total;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_order_payment(
  p_order_id uuid,
  p_payment_method text,
  p_amount_received numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_method text;
  v_received numeric;
  v_change numeric;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_method := lower(btrim(COALESCE(p_payment_method, '')));
  IF v_method NOT IN ('cash', 'card', 'instapay') THEN
    RAISE EXCEPTION 'invalid_payment_method';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_order.paid_at IS NOT NULL THEN
    RAISE EXCEPTION 'already_paid';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'order_cancelled';
  END IF;

  IF v_method = 'cash' THEN
    IF p_amount_received IS NULL OR NOT (p_amount_received >= v_order.total) THEN
      RAISE EXCEPTION 'insufficient_cash';
    END IF;
    v_received := round(p_amount_received, 2);
    v_change := round(v_received - v_order.total, 2);
  ELSE
    v_received := v_order.total;
    v_change := 0;
  END IF;

  PERFORM set_config('warda.order_rpc_bypass', '1', true);

  UPDATE public.orders
  SET
    payment_method = v_method,
    amount_received = v_received,
    change_due = v_change,
    paid_at = now(),
    status = 'completed',
    updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'id', p_order_id,
    'payment_method', v_method,
    'amount_received', v_received,
    'change_due', v_change,
    'paid_at', now(),
    'status', 'completed',
    'total', v_order.total
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.void_order_item(
  p_item_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.order_items%ROWTYPE;
  v_reason text;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_reason := btrim(COALESCE(p_reason, ''));
  IF v_reason = '' OR char_length(v_reason) > 500 THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  SELECT oi.* INTO v_item
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.id = p_item_id
  FOR UPDATE OF oi;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'item_not_found';
  END IF;

  IF v_item.voided_at IS NOT NULL THEN
    RAISE EXCEPTION 'already_voided';
  END IF;

  PERFORM public.assert_order_not_in_closed_shift(
    (SELECT created_at FROM public.orders WHERE id = v_item.order_id)
  );

  UPDATE public.order_items
  SET voided_at = now(), void_reason = v_reason
  WHERE id = p_item_id;

  RETURN jsonb_build_object('id', p_item_id, 'voided_at', now(), 'void_reason', v_reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.void_order(
  p_order_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_reason text;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_reason := btrim(COALESCE(p_reason, ''));
  IF v_reason = '' OR char_length(v_reason) > 500 THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'already_voided';
  END IF;

  PERFORM public.assert_order_not_in_closed_shift(v_order.created_at);

  PERFORM set_config('warda.order_rpc_bypass', '1', true);

  UPDATE public.orders
  SET status = 'cancelled', void_reason = v_reason, updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'id', p_order_id,
    'status', 'cancelled',
    'void_reason', v_reason
  );
END;
$$;

REVOKE ALL ON FUNCTION public.assert_order_not_in_closed_shift(timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_order_payment(uuid, text, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.void_order_item(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.void_order(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.close_order_payment(uuid, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_order_item(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_order(uuid, text) TO authenticated;

COMMENT ON COLUMN public.orders.payment_method IS 'Register close: cash, card, or instapay (staff RPC only).';
COMMENT ON COLUMN public.orders.void_reason IS 'Staff void reason when order status is cancelled.';
COMMENT ON COLUMN public.order_items.voided_at IS 'When a line was voided at register; row kept for audit.';
