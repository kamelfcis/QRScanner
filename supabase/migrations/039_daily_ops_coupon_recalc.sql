-- Daily ops phase 3: coupon re-evaluation on edit, allow RPC total recalc through trigger
-- Version: 039
-- Date: 2026-09-23

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

CREATE OR REPLACE FUNCTION public.recalculate_order_totals(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_taxable numeric;
  v_tax numeric := 0;
  v_service numeric := 0;
  v_total numeric;
  v_restaurant jsonb;
  v_features jsonb;
  v_tax_rate numeric;
  v_service_rate numeric;
  v_apply_tax boolean;
  v_apply_service boolean;
  v_lines jsonb := '[]'::jsonb;
  v_resolved jsonb;
  v_coupon_id uuid;
  v_coupon_code text;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'product_id', oi.product_id,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price
      )
      ORDER BY oi.created_at
    ),
    '[]'::jsonb
  )
  INTO v_lines
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id
    AND oi.voided_at IS NULL;

  SELECT COALESCE(sum(oi.quantity * oi.unit_price), 0)
  INTO v_subtotal
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id
    AND oi.voided_at IS NULL;

  v_subtotal := round(v_subtotal, 2);

  SELECT value INTO v_features FROM public.settings WHERE key = 'features';
  SELECT value INTO v_restaurant FROM public.settings WHERE key = 'restaurant';
  v_tax_rate := COALESCE((v_restaurant->>'tax_rate')::numeric, 15);
  v_service_rate := COALESCE((v_restaurant->>'service_charge_rate')::numeric, 10);
  v_apply_tax := COALESCE((v_restaurant->>'apply_tax')::boolean, true);
  v_apply_service := COALESCE((v_restaurant->>'apply_service_charge')::boolean, true);

  v_coupon_id := v_order.coupon_id;
  v_coupon_code := v_order.coupon_code;

  IF COALESCE((v_features->>'coupons')::boolean, false) IS TRUE THEN
    v_resolved := public.evaluate_order_discounts(
      v_order.coupon_code,
      v_subtotal,
      v_order.customer_phone,
      false,
      v_lines
    );

    IF COALESCE((v_resolved->>'valid')::boolean, false) IS TRUE THEN
      v_discount := COALESCE((v_resolved->>'discount_amount')::numeric, 0);
      v_coupon_id := NULLIF(v_resolved->>'coupon_id', '')::uuid;
      v_coupon_code := NULLIF(v_resolved->>'code', '');
    ELSE
      v_discount := 0;
      v_coupon_id := NULL;
      v_coupon_code := NULL;
    END IF;
  ELSE
    v_discount := round(least(COALESCE(v_order.discount_amount, 0), v_subtotal), 2);
  END IF;

  v_taxable := round(v_subtotal - v_discount, 2);
  IF v_apply_tax THEN
    v_tax := round(v_taxable * (v_tax_rate / 100.0), 2);
  END IF;
  IF v_apply_service THEN
    v_service := round(v_taxable * (v_service_rate / 100.0), 2);
  END IF;
  v_total := round(v_taxable + v_tax + v_service + COALESCE(v_order.delivery_fee, 0), 2);

  PERFORM set_config('warda.order_rpc_bypass', '1', true);

  UPDATE public.orders
  SET
    subtotal = v_subtotal,
    discount_amount = v_discount,
    coupon_id = v_coupon_id,
    coupon_code = v_coupon_code,
    tax = v_tax,
    service = v_service,
    total = v_total,
    updated_at = now()
  WHERE id = p_order_id;
END;
$$;

COMMENT ON FUNCTION public.recalculate_order_totals(uuid) IS
  'Recompute subtotal/discount/tax/service/total from non-voided lines; re-evaluates coupons when enabled.';
