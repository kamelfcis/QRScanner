-- Per-order staff delivery fee. Not a coupon and not restaurant service %.
-- Version: 024
-- Date: 2026-08-23
-- Staff UPDATE already allowed. Trigger recomputes total when delivery_fee changes.
-- place_customer_order always inserts delivery_fee = 0 (client cannot set it).

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_money_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_money_check CHECK (
    subtotal >= 0
    AND tax >= 0
    AND service >= 0
    AND discount_amount >= 0
    AND delivery_fee >= 0
    AND total >= 0
  );

CREATE OR REPLACE FUNCTION public.protect_order_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.id := OLD.id;
  NEW.order_number := OLD.order_number;
  NEW.dining_mode := OLD.dining_mode;
  NEW.fulfillment_type := OLD.fulfillment_type;
  NEW.table_number := OLD.table_number;
  NEW.customer_name := OLD.customer_name;
  NEW.customer_phone := OLD.customer_phone;
  NEW.delivery_address := OLD.delivery_address;
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

  IF NEW.delivery_fee IS DISTINCT FROM OLD.delivery_fee THEN
    NEW.delivery_fee := round(greatest(least(COALESCE(NEW.delivery_fee, 0), 99999.99), 0), 2);
    NEW.total := round(
      OLD.subtotal - OLD.discount_amount + OLD.tax + OLD.service + NEW.delivery_fee,
      2
    );
  ELSE
    NEW.delivery_fee := OLD.delivery_fee;
    NEW.total := OLD.total;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.place_customer_order(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_features jsonb;
  v_restaurant jsonb;
  v_dining_mode text;
  v_fulfillment text;
  v_table_number text;
  v_customer_name text;
  v_customer_phone text;
  v_delivery_address text;
  v_notes text;
  v_locale text;
  v_whatsapp_sent boolean;
  v_client_ip text;
  v_coupon_code text;
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_qty integer;
  v_size text;
  v_unit numeric;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_tax numeric := 0;
  v_service numeric := 0;
  v_total numeric := 0;
  v_taxable numeric := 0;
  v_tax_rate numeric;
  v_service_rate numeric;
  v_apply_tax boolean;
  v_apply_service boolean;
  v_min_order numeric;
  v_max_notes integer;
  v_item_count integer;
  v_phone_count integer;
  v_ip_count integer;
  v_currency text;
  v_prefix text;
  v_order_id uuid;
  v_order_number text;
  v_lines jsonb := '[]'::jsonb;
  v_item_notes text;
  v_resolved jsonb;
  v_coupon_id uuid;
BEGIN
  SELECT value INTO v_features FROM public.settings WHERE key = 'features';
  IF COALESCE((v_features->>'dashboard_orders')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'feature_disabled';
  END IF;

  SELECT value INTO v_restaurant FROM public.settings WHERE key = 'restaurant';

  v_dining_mode := payload->>'dining_mode';
  IF v_dining_mode IS NULL OR v_dining_mode NOT IN ('dining', 'takeaway') THEN
    RAISE EXCEPTION 'invalid_payload';
  END IF;

  v_fulfillment := NULLIF(btrim(COALESCE(payload->>'fulfillment_type', '')), '');
  IF v_dining_mode = 'takeaway' THEN
    IF v_fulfillment IS NULL OR v_fulfillment NOT IN ('pickup', 'delivery') THEN
      v_fulfillment := 'pickup';
    END IF;
  ELSE
    v_fulfillment := NULL;
  END IF;

  v_table_number := NULLIF(btrim(COALESCE(payload->>'table_number', '')), '');
  v_customer_name := btrim(COALESCE(payload->>'customer_name', ''));
  v_customer_phone := NULLIF(btrim(COALESCE(payload->>'customer_phone', '')), '');
  v_delivery_address := NULLIF(btrim(COALESCE(payload->>'delivery_address', '')), '');
  v_notes := NULLIF(btrim(COALESCE(payload->>'notes', '')), '');
  v_locale := COALESCE(NULLIF(payload->>'locale', ''), 'en');
  IF v_locale NOT IN ('en', 'ar', 'fr', 'nl') THEN
    v_locale := 'en';
  END IF;
  v_whatsapp_sent := COALESCE((payload->>'whatsapp_sent')::boolean, false);
  v_client_ip := NULLIF(btrim(COALESCE(payload->>'client_ip', '')), '');
  v_coupon_code := NULLIF(upper(btrim(COALESCE(payload->>'coupon_code', ''))), '');

  IF v_customer_name = '' OR char_length(v_customer_name) > 200 THEN
    RAISE EXCEPTION 'name_required';
  END IF;

  IF v_customer_phone IS NOT NULL AND char_length(v_customer_phone) > 40 THEN
    RAISE EXCEPTION 'invalid_payload';
  END IF;

  IF v_dining_mode = 'takeaway' AND v_fulfillment = 'delivery' AND v_delivery_address IS NULL THEN
    RAISE EXCEPTION 'address_required';
  END IF;

  IF v_delivery_address IS NOT NULL AND char_length(v_delivery_address) > 500 THEN
    RAISE EXCEPTION 'invalid_payload';
  END IF;

  v_max_notes := COALESCE((v_restaurant->>'max_order_notes_length')::integer, 200);
  IF v_notes IS NOT NULL AND char_length(v_notes) > v_max_notes THEN
    RAISE EXCEPTION 'notes_too_long';
  END IF;

  IF jsonb_typeof(payload->'items') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'empty_cart';
  END IF;

  v_item_count := jsonb_array_length(payload->'items');
  IF v_item_count IS NULL OR v_item_count < 1 OR v_item_count > 50 THEN
    RAISE EXCEPTION 'empty_cart';
  END IF;

  DELETE FROM public.order_place_attempts
  WHERE created_at < now() - interval '1 hour';

  IF v_customer_phone IS NOT NULL THEN
    SELECT count(*) INTO v_phone_count
    FROM public.order_place_attempts
    WHERE phone_key = v_customer_phone
      AND created_at > now() - interval '15 minutes';
    IF v_phone_count >= 8 THEN
      RAISE EXCEPTION 'rate_limited';
    END IF;
  END IF;

  IF v_client_ip IS NOT NULL THEN
    SELECT count(*) INTO v_ip_count
    FROM public.order_place_attempts
    WHERE ip_key = v_client_ip
      AND created_at > now() - interval '15 minutes';
    IF v_ip_count >= 12 THEN
      RAISE EXCEPTION 'rate_limited';
    END IF;
  END IF;

  INSERT INTO public.order_place_attempts (phone_key, ip_key)
  VALUES (v_customer_phone, v_client_ip);

  v_tax_rate := COALESCE((v_restaurant->>'tax_rate')::numeric, 15);
  v_service_rate := COALESCE((v_restaurant->>'service_charge_rate')::numeric, 10);
  v_apply_tax := COALESCE((v_restaurant->>'apply_tax')::boolean, true);
  v_apply_service := COALESCE((v_restaurant->>'apply_service_charge')::boolean, true);
  v_min_order := COALESCE((v_restaurant->>'minimum_order')::numeric, 0);
  v_currency := COALESCE(NULLIF(v_restaurant->>'currency', ''), 'EGP');
  v_prefix := upper(COALESCE(NULLIF(v_features->>'order_prefix', ''), 'ORD'));

  FOR v_item IN SELECT value FROM jsonb_array_elements(payload->'items')
  LOOP
    v_qty := COALESCE((v_item->>'quantity')::integer, 0);
    IF v_qty < 1 OR v_qty > 99 THEN
      RAISE EXCEPTION 'invalid_payload';
    END IF;

    v_size := NULLIF(v_item->>'size_option', '');
    IF v_size IS NOT NULL AND v_size NOT IN ('small', 'large') THEN
      RAISE EXCEPTION 'invalid_payload';
    END IF;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::uuid;

    IF NOT FOUND OR v_product.is_available IS NOT TRUE THEN
      RAISE EXCEPTION 'product_unavailable';
    END IF;

    v_item_notes := NULLIF(btrim(COALESCE(v_item->>'notes', '')), '');
    IF v_item_notes IS NOT NULL AND char_length(v_item_notes) > v_max_notes THEN
      RAISE EXCEPTION 'notes_too_long';
    END IF;

    IF v_product.has_size_options IS TRUE AND v_size = 'small' THEN
      v_unit := v_product.dining_price;
    ELSIF v_product.has_size_options IS TRUE AND v_size = 'large' THEN
      v_unit := v_product.takeaway_price;
    ELSIF v_dining_mode = 'takeaway' THEN
      v_unit := v_product.takeaway_price;
    ELSE
      v_unit := v_product.dining_price;
    END IF;

    v_subtotal := v_subtotal + (v_unit * v_qty);

    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_product.id,
        'name_ar', v_product.name_ar,
        'name_en', v_product.name_en,
        'name_fr', v_product.name_fr,
        'name_nl', v_product.name_nl,
        'quantity', v_qty,
        'unit_price', v_unit,
        'size_option', v_size,
        'notes', v_item_notes
      )
    );
  END LOOP;

  v_subtotal := round(v_subtotal, 2);
  IF v_min_order > 0 AND v_subtotal < v_min_order THEN
    RAISE EXCEPTION 'min_order';
  END IF;

  IF v_coupon_code IS NOT NULL THEN
    IF COALESCE((v_features->>'coupons')::boolean, false) IS NOT TRUE THEN
      RAISE EXCEPTION 'invalid_coupon';
    END IF;

    v_resolved := public.resolve_coupon_discount(
      v_coupon_code, v_subtotal, v_customer_phone, true
    );

    IF COALESCE((v_resolved->>'valid')::boolean, false) IS NOT TRUE THEN
      RAISE EXCEPTION '%', COALESCE(v_resolved->>'error', 'invalid_coupon');
    END IF;

    v_discount := COALESCE((v_resolved->>'discount_amount')::numeric, 0);
    v_coupon_id := (v_resolved->>'coupon_id')::uuid;
    v_coupon_code := v_resolved->>'code';
  END IF;

  v_taxable := round(v_subtotal - v_discount, 2);
  IF v_apply_tax THEN
    v_tax := round(v_taxable * (v_tax_rate / 100.0), 2);
  END IF;
  IF v_apply_service THEN
    v_service := round(v_taxable * (v_service_rate / 100.0), 2);
  END IF;
  v_total := round(v_taxable + v_tax + v_service, 2);

  v_order_number := v_prefix || '-' || lpad(nextval('public.order_number_seq')::text, 4, '0');

  INSERT INTO public.orders (
    order_number, status, dining_mode, fulfillment_type, table_number,
    customer_name, customer_phone, delivery_address, notes,
    subtotal, tax, service, discount_amount, coupon_id, coupon_code,
    delivery_fee, total, currency, whatsapp_sent, locale
  ) VALUES (
    v_order_number, 'new', v_dining_mode, v_fulfillment, v_table_number,
    v_customer_name, v_customer_phone, v_delivery_address, v_notes,
    v_subtotal, v_tax, v_service, v_discount, v_coupon_id, v_coupon_code,
    0, v_total, v_currency, v_whatsapp_sent, v_locale
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id, product_id, name_ar, name_en, name_fr, name_nl,
    quantity, unit_price, size_option, notes
  )
  SELECT
    v_order_id,
    x.product_id,
    x.name_ar,
    x.name_en,
    x.name_fr,
    x.name_nl,
    x.quantity,
    x.unit_price,
    x.size_option,
    x.notes
  FROM jsonb_to_recordset(v_lines) AS x(
    product_id uuid,
    name_ar text,
    name_en text,
    name_fr text,
    name_nl text,
    quantity integer,
    unit_price numeric,
    size_option text,
    notes text
  );

  IF v_coupon_id IS NOT NULL THEN
    INSERT INTO public.coupon_redemptions (
      coupon_id, order_id, code_snapshot, discount_amount, phone_key
    ) VALUES (
      v_coupon_id, v_order_id, v_coupon_code, v_discount, v_customer_phone
    );

    UPDATE public.coupons
    SET redeemed_count = redeemed_count + 1
    WHERE id = v_coupon_id;
  END IF;

  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'tax', v_tax,
    'service', v_service,
    'discount_amount', v_discount,
    'coupon_code', v_coupon_code,
    'delivery_fee', 0,
    'total', v_total,
    'currency', v_currency
  );
END;
$$;

REVOKE ALL ON FUNCTION public.protect_order_immutable_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.place_customer_order(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_customer_order(jsonb) TO anon, authenticated;

COMMENT ON COLUMN public.orders.delivery_fee IS
  'Staff-entered delivery fee. Customer checkout always inserts 0. Trigger recomputes total.';
