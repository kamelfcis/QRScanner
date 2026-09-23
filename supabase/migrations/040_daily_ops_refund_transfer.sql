-- Daily ops phase 4: paid-order refunds, dine-in table transfer, void guard
-- Version: 040
-- Date: 2026-09-23

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_refunded_at
  ON public.orders (refunded_at DESC)
  WHERE refunded_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.protect_order_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_bypass boolean := current_setting('warda.order_rpc_bypass', true) = '1';
  v_table_transfer boolean := current_setting('warda.order_table_transfer', true) = '1';
BEGIN
  NEW.id := OLD.id;
  NEW.order_number := OLD.order_number;
  NEW.dining_mode := OLD.dining_mode;
  NEW.fulfillment_type := OLD.fulfillment_type;
  IF NOT v_table_transfer THEN
    NEW.table_number := OLD.table_number;
  END IF;
  NEW.customer_name := OLD.customer_name;
  NEW.customer_phone := OLD.customer_phone;
  NEW.delivery_address := OLD.delivery_address;
  NEW.delivery_location_id := OLD.delivery_location_id;
  NEW.notes := OLD.notes;
  NEW.currency := OLD.currency;
  NEW.locale := OLD.locale;
  NEW.created_at := OLD.created_at;
  NEW.order_channel := OLD.order_channel;

  IF NOT v_bypass THEN
    NEW.subtotal := OLD.subtotal;
    NEW.tax := OLD.tax;
    NEW.service := OLD.service;
    NEW.discount_amount := OLD.discount_amount;
    NEW.coupon_id := OLD.coupon_id;
    NEW.coupon_code := OLD.coupon_code;
    NEW.payment_method := OLD.payment_method;
    NEW.amount_received := OLD.amount_received;
    NEW.change_due := OLD.change_due;
    NEW.paid_at := OLD.paid_at;
    NEW.void_reason := OLD.void_reason;
    NEW.refunded_at := OLD.refunded_at;
    NEW.refund_reason := OLD.refund_reason;
  ELSE
    IF NEW.payment_method IS NOT NULL THEN
      NEW.payment_method := lower(btrim(NEW.payment_method));
    END IF;
    IF NEW.amount_received IS NOT NULL THEN
      NEW.amount_received := round(greatest(COALESCE(NEW.amount_received, 0), 0), 2);
    END IF;
    IF NEW.change_due IS NOT NULL THEN
      NEW.change_due := round(greatest(COALESCE(NEW.change_due, 0), 0), 2);
    END IF;
  END IF;

  IF NEW.delivery_fee IS DISTINCT FROM OLD.delivery_fee THEN
    NEW.delivery_fee := round(greatest(least(COALESCE(NEW.delivery_fee, 0), 99999.99), 0), 2);
    IF NOT v_bypass THEN
      NEW.total := round(
        OLD.subtotal - OLD.discount_amount + OLD.tax + OLD.service + NEW.delivery_fee,
        2
      );
    END IF;
  ELSIF NOT v_bypass THEN
    NEW.delivery_fee := OLD.delivery_fee;
    NEW.total := OLD.total;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_order_payment(
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

  IF v_order.paid_at IS NULL THEN
    RAISE EXCEPTION 'not_paid';
  END IF;

  IF v_order.refunded_at IS NOT NULL THEN
    RAISE EXCEPTION 'already_refunded';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'already_refunded';
  END IF;

  PERFORM public.assert_order_not_in_closed_shift(v_order.created_at);

  PERFORM set_config('warda.order_rpc_bypass', '1', true);

  UPDATE public.orders
  SET
    refunded_at = now(),
    refund_reason = v_reason,
    status = 'cancelled',
    updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN to_jsonb(v_order);
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_order_table(
  p_order_id uuid,
  p_table_number text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_table text;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_table := btrim(COALESCE(p_table_number, ''));
  IF v_table = '' OR char_length(v_table) > 20 THEN
    RAISE EXCEPTION 'invalid_table';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_order.dining_mode <> 'dining' THEN
    RAISE EXCEPTION 'not_dine_in';
  END IF;

  IF v_order.paid_at IS NOT NULL THEN
    RAISE EXCEPTION 'already_paid';
  END IF;

  IF v_order.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'order_closed';
  END IF;

  PERFORM public.assert_order_not_in_closed_shift(v_order.created_at);

  IF EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.dining_mode = 'dining'
      AND o.table_number = v_table
      AND o.status NOT IN ('completed', 'cancelled')
      AND o.id <> p_order_id
  ) THEN
    RAISE EXCEPTION 'table_occupied';
  END IF;

  PERFORM set_config('warda.order_table_transfer', '1', true);

  UPDATE public.orders
  SET table_number = v_table, updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  PERFORM set_config('warda.order_table_transfer', '0', true);

  RETURN to_jsonb(v_order);
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

  IF v_order.paid_at IS NOT NULL THEN
    RAISE EXCEPTION 'already_paid';
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

REVOKE ALL ON FUNCTION public.refund_order_payment(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transfer_order_table(uuid, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.refund_order_payment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_order_table(uuid, text) TO authenticated;

COMMENT ON COLUMN public.orders.refunded_at IS 'When a paid order was fully refunded at register.';
COMMENT ON COLUMN public.orders.refund_reason IS 'Staff reason for full refund; payment audit columns retained.';
COMMENT ON FUNCTION public.refund_order_payment(uuid, text) IS
  'Full refund for paid orders; keeps payment_method/amount_received/paid_at for audit.';
COMMENT ON FUNCTION public.transfer_order_table(uuid, text) IS
  'Move an open unpaid dine-in order to a free table.';
