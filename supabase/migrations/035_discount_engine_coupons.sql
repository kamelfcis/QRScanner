-- Discount engine wire-up: automatic coupons + BOGO (SQL is source of truth)
-- Version: 035
-- Date: 2026-09-18
--
-- Stacking (mirrors src/lib/order/discount-engine.ts):
--   * Amounts from original eligible line prices; total capped at subtotal.
--   * Autos: non-stackable first, then higher amount; one exclusive may still
--     combine with later stackable rules.
--   * Guest code: invalid code fails closed. Non-stackable code blocks autos.
--     Stackable code combines only with stackable automatics.
--
-- Goldens (tests/unit/discount-engine.test.ts DISCOUNT_ENGINE_SQL_GOLDENS):
--   bogo-buy2-get1-qty3            => 10
--   fixed-order-15-on-40           => 15
--   tiered-bulk-two-stackable-pct  => 25
--   competing-line-exclusive-wins  => 8
--   code-exclusive-blocks-auto     => 5
--   code-stackable-plus-auto       => 15

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS requires_code BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_stackable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bogo_buy INTEGER,
  ADD COLUMN IF NOT EXISTS bogo_get INTEGER,
  ADD COLUMN IF NOT EXISTS min_quantity INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS product_ids UUID[];

ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_type_check;
ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_type_check CHECK (discount_type IN ('percentage', 'fixed', 'bogo'));

ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_value_check;
ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_value_check CHECK (
    discount_value > 0
    AND (
      (discount_type = 'percentage' AND discount_value <= 100)
      OR discount_type = 'fixed'
      OR discount_type = 'bogo'
    )
  );

ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_bogo_check;
ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_bogo_check CHECK (
    (
      discount_type <> 'bogo'
      AND bogo_buy IS NULL
      AND bogo_get IS NULL
    )
    OR (
      discount_type = 'bogo'
      AND bogo_buy >= 1
      AND bogo_get >= 1
    )
  );

ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_min_quantity_check;
ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_min_quantity_check CHECK (min_quantity >= 0);

CREATE INDEX IF NOT EXISTS idx_coupons_automatic_active
  ON public.coupons (is_active, requires_code)
  WHERE is_active IS TRUE AND requires_code IS FALSE;

ALTER TABLE public.coupon_redemptions DROP CONSTRAINT IF EXISTS coupon_redemptions_order_unique;
ALTER TABLE public.coupon_redemptions DROP CONSTRAINT IF EXISTS coupon_redemptions_order_coupon_unique;
ALTER TABLE public.coupon_redemptions
  ADD CONSTRAINT coupon_redemptions_order_coupon_unique UNIQUE (order_id, coupon_id);

CREATE OR REPLACE FUNCTION public.coupon_compute_amount(
  p_coupon public.coupons,
  p_lines jsonb,
  p_subtotal numeric
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_line jsonb;
  v_pid uuid;
  v_qty integer;
  v_unit numeric;
  v_entitled numeric := 0;
  v_qty_total integer := 0;
  v_units numeric[] := '{}';
  v_sorted numeric[];
  v_buy integer;
  v_get integer;
  v_free integer;
  v_amount numeric := 0;
  v_i integer;
BEGIN
  IF (p_coupon.starts_at IS NOT NULL AND now() < p_coupon.starts_at)
     OR (p_coupon.ends_at IS NOT NULL AND now() > p_coupon.ends_at) THEN
    RETURN 0;
  END IF;

  IF p_subtotal < p_coupon.min_subtotal THEN
    RETURN 0;
  END IF;

  FOR v_line IN SELECT value FROM jsonb_array_elements(COALESCE(p_lines, '[]'::jsonb))
  LOOP
    BEGIN
      v_pid := (v_line->>'product_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;

    IF p_coupon.product_ids IS NOT NULL
       AND cardinality(p_coupon.product_ids) > 0
       AND NOT (v_pid = ANY (p_coupon.product_ids)) THEN
      CONTINUE;
    END IF;

    v_qty := COALESCE((v_line->>'quantity')::integer, 0);
    v_unit := COALESCE((v_line->>'unit_price')::numeric, 0);
    IF v_qty < 1 THEN
      CONTINUE;
    END IF;

    v_entitled := v_entitled + (v_unit * v_qty);
    v_qty_total := v_qty_total + v_qty;
    IF p_coupon.discount_type = 'bogo' THEN
      v_units := v_units || array_fill(v_unit, ARRAY[v_qty]);
    END IF;
  END LOOP;

  IF COALESCE(p_coupon.min_quantity, 0) > 0 AND v_qty_total < p_coupon.min_quantity THEN
    RETURN 0;
  END IF;

  IF p_coupon.discount_type = 'percentage' THEN
    IF v_entitled <= 0 THEN RETURN 0; END IF;
    v_amount := round(v_entitled * (p_coupon.discount_value / 100.0), 2);
  ELSIF p_coupon.discount_type = 'fixed' THEN
    IF v_entitled <= 0 THEN RETURN 0; END IF;
    v_amount := round(LEAST(p_coupon.discount_value, v_entitled, p_subtotal), 2);
  ELSIF p_coupon.discount_type = 'bogo' THEN
    v_buy := GREATEST(COALESCE(p_coupon.bogo_buy, 1), 1);
    v_get := GREATEST(COALESCE(p_coupon.bogo_get, 1), 1);
    IF COALESCE(array_length(v_units, 1), 0) < (v_buy + v_get) THEN
      RETURN 0;
    END IF;
    SELECT array_agg(u ORDER BY u) INTO v_sorted FROM unnest(v_units) AS u;
    v_free := (COALESCE(array_length(v_sorted, 1), 0) / (v_buy + v_get)) * v_get;
    v_amount := 0;
    FOR v_i IN 1..v_free LOOP
      v_amount := v_amount + v_sorted[v_i];
    END LOOP;
    v_amount := round(v_amount, 2);
  ELSE
    RETURN 0;
  END IF;

  IF p_coupon.max_discount IS NOT NULL THEN
    v_amount := LEAST(v_amount, p_coupon.max_discount);
  END IF;

  RETURN round(
    GREATEST(LEAST(v_amount, p_subtotal, COALESCE(NULLIF(v_entitled, 0), p_subtotal)), 0),
    2
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.coupon_gate_error(
  p_coupon public.coupons,
  p_subtotal numeric,
  p_phone text
)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_phone_uses integer := 0;
BEGIN
  IF p_coupon.is_active IS NOT TRUE THEN
    RETURN 'inactive';
  END IF;
  IF (p_coupon.starts_at IS NOT NULL AND now() < p_coupon.starts_at)
     OR (p_coupon.ends_at IS NOT NULL AND now() > p_coupon.ends_at) THEN
    RETURN 'expired';
  END IF;
  IF p_coupon.max_redemptions IS NOT NULL
     AND p_coupon.redeemed_count >= p_coupon.max_redemptions THEN
    RETURN 'usage_exhausted';
  END IF;
  IF p_subtotal < p_coupon.min_subtotal THEN
    RETURN 'min_order';
  END IF;
  IF p_phone IS NOT NULL AND p_phone <> '' THEN
    SELECT count(*) INTO v_phone_uses
    FROM public.coupon_redemptions
    WHERE coupon_id = p_coupon.id
      AND phone_key = p_phone;
    IF v_phone_uses >= p_coupon.per_phone_limit THEN
      RETURN 'phone_limit';
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP FUNCTION IF EXISTS public.resolve_coupon_discount(text, numeric, text, boolean);

CREATE OR REPLACE FUNCTION public.resolve_coupon_discount(
  p_code text,
  p_subtotal numeric,
  p_phone text,
  p_lock boolean,
  p_lines jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_coupon public.coupons%ROWTYPE;
  v_discount numeric := 0;
  v_error text;
BEGIN
  v_code := upper(btrim(COALESCE(p_code, '')));
  IF v_code = '' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'invalid_coupon');
  END IF;

  IF p_lock THEN
    SELECT * INTO v_coupon FROM public.coupons WHERE code = v_code FOR UPDATE;
  ELSE
    SELECT * INTO v_coupon FROM public.coupons WHERE code = v_code;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'invalid_coupon');
  END IF;

  v_error := public.coupon_gate_error(v_coupon, p_subtotal, p_phone);
  IF v_error IS NOT NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', v_error,
      'min_subtotal', v_coupon.min_subtotal
    );
  END IF;

  v_discount := public.coupon_compute_amount(v_coupon, p_lines, p_subtotal);
  IF v_discount <= 0 THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'min_order',
      'min_subtotal', v_coupon.min_subtotal
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'discount_amount', v_discount,
    'is_stackable', v_coupon.is_stackable,
    'requires_code', v_coupon.requires_code
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.evaluate_order_discounts(
  p_code text,
  p_subtotal numeric,
  p_phone text,
  p_lock boolean,
  p_lines jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_coded public.coupons%ROWTYPE;
  v_coded_id uuid;
  v_coded_stackable boolean := false;
  v_auto public.coupons%ROWTYPE;
  v_error text;
  v_amount numeric;
  v_candidates jsonb := '[]'::jsonb;
  v_chosen jsonb := '[]'::jsonb;
  v_row record;
  v_non_stackable_applied boolean := false;
  v_remaining numeric;
  v_applied numeric;
  v_total numeric := 0;
  v_primary_id uuid;
  v_primary_code text;
  v_primary_type text;
  v_primary_value numeric;
BEGIN
  v_code := NULLIF(upper(btrim(COALESCE(p_code, ''))), '');
  v_remaining := round(GREATEST(p_subtotal, 0), 2);

  IF p_lock THEN
    PERFORM 1
    FROM public.coupons
    WHERE is_active IS TRUE
      AND requires_code IS FALSE
    FOR UPDATE;
  END IF;

  IF v_code IS NOT NULL THEN
    IF p_lock THEN
      SELECT * INTO v_coded FROM public.coupons WHERE code = v_code FOR UPDATE;
    ELSE
      SELECT * INTO v_coded FROM public.coupons WHERE code = v_code;
    END IF;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('valid', false, 'error', 'invalid_coupon');
    END IF;

    v_error := public.coupon_gate_error(v_coded, p_subtotal, p_phone);
    IF v_error IS NOT NULL THEN
      RETURN jsonb_build_object(
        'valid', false,
        'error', v_error,
        'min_subtotal', v_coded.min_subtotal
      );
    END IF;

    v_amount := public.coupon_compute_amount(v_coded, p_lines, p_subtotal);
    IF v_amount <= 0 THEN
      RETURN jsonb_build_object(
        'valid', false,
        'error', 'min_order',
        'min_subtotal', v_coded.min_subtotal
      );
    END IF;

    v_coded_id := v_coded.id;
    v_coded_stackable := v_coded.is_stackable IS TRUE;

    v_candidates := v_candidates || jsonb_build_array(
      jsonb_build_object(
        'coupon_id', v_coded.id,
        'code', v_coded.code,
        'discount_type', v_coded.discount_type,
        'discount_value', v_coded.discount_value,
        'discount_amount', v_amount,
        'is_stackable', v_coded.is_stackable,
        'automatic', v_coded.requires_code IS NOT TRUE,
        'requires_code', v_coded.requires_code IS TRUE
      )
    );
  END IF;

  FOR v_auto IN
    SELECT *
    FROM public.coupons
    WHERE is_active IS TRUE
      AND requires_code IS FALSE
      AND (v_coded_id IS NULL OR id <> v_coded_id)
  LOOP
    IF public.coupon_gate_error(v_auto, p_subtotal, p_phone) IS NOT NULL THEN
      CONTINUE;
    END IF;
    IF v_code IS NOT NULL AND v_coded_stackable AND v_auto.is_stackable IS NOT TRUE THEN
      CONTINUE;
    END IF;
    IF v_code IS NOT NULL AND v_coded_stackable IS NOT TRUE THEN
      CONTINUE;
    END IF;

    v_amount := public.coupon_compute_amount(v_auto, p_lines, p_subtotal);
    IF v_amount <= 0 THEN
      CONTINUE;
    END IF;

    v_candidates := v_candidates || jsonb_build_array(
      jsonb_build_object(
        'coupon_id', v_auto.id,
        'code', v_auto.code,
        'discount_type', v_auto.discount_type,
        'discount_value', v_auto.discount_value,
        'discount_amount', v_amount,
        'is_stackable', v_auto.is_stackable,
        'automatic', true,
        'requires_code', false
      )
    );
  END LOOP;

  FOR v_row IN
    SELECT *
    FROM jsonb_to_recordset(v_candidates) AS x(
      coupon_id uuid,
      code text,
      discount_type text,
      discount_value numeric,
      discount_amount numeric,
      is_stackable boolean,
      automatic boolean,
      requires_code boolean
    )
    ORDER BY CASE WHEN x.is_stackable THEN 1 ELSE 0 END,
             x.discount_amount DESC,
             x.coupon_id
  LOOP
    IF v_remaining <= 0 THEN
      EXIT;
    END IF;
    IF v_row.is_stackable IS NOT TRUE AND v_non_stackable_applied THEN
      CONTINUE;
    END IF;

    v_applied := round(LEAST(v_row.discount_amount, v_remaining), 2);
    IF v_applied <= 0 THEN
      CONTINUE;
    END IF;

    v_chosen := v_chosen || jsonb_build_array(
      jsonb_build_object(
        'coupon_id', v_row.coupon_id,
        'code', v_row.code,
        'discount_type', v_row.discount_type,
        'discount_value', v_row.discount_value,
        'discount_amount', v_applied,
        'is_stackable', v_row.is_stackable,
        'automatic', v_row.automatic,
        'requires_code', COALESCE(v_row.requires_code, v_row.automatic IS NOT TRUE)
      )
    );
    v_total := round(v_total + v_applied, 2);
    v_remaining := round(v_remaining - v_applied, 2);
    IF v_row.is_stackable IS NOT TRUE THEN
      v_non_stackable_applied := true;
    END IF;
  END LOOP;

  IF v_code IS NOT NULL THEN
    v_primary_id := v_coded.id;
    v_primary_code := v_coded.code;
    v_primary_type := v_coded.discount_type;
    v_primary_value := v_coded.discount_value;
  ELSIF jsonb_array_length(v_chosen) > 0 THEN
    v_primary_id := (v_chosen->0->>'coupon_id')::uuid;
    v_primary_code := v_chosen->0->>'code';
    v_primary_type := v_chosen->0->>'discount_type';
    v_primary_value := (v_chosen->0->>'discount_value')::numeric;
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'error', NULL,
    'coupon_id', v_primary_id,
    'code', v_primary_code,
    'discount_type', v_primary_type,
    'discount_value', v_primary_value,
    'discount_amount', v_total,
    'applications', v_chosen
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.preview_customer_coupon(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_features jsonb;
  v_restaurant jsonb;
  v_dining_mode text;
  v_coupon_code text;
  v_customer_phone text;
  v_client_ip text;
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
  v_phone_count integer;
  v_ip_count integer;
  v_item_count integer;
  v_resolved jsonb;
  v_lines jsonb := '[]'::jsonb;
BEGIN
  SELECT value INTO v_features FROM public.settings WHERE key = 'features';
  IF COALESCE((v_features->>'coupons')::boolean, false) IS NOT TRUE THEN
    RETURN jsonb_build_object('valid', false, 'error', 'feature_disabled');
  END IF;

  SELECT value INTO v_restaurant FROM public.settings WHERE key = 'restaurant';

  v_dining_mode := payload->>'dining_mode';
  IF v_dining_mode IS NULL OR v_dining_mode NOT IN ('dining', 'takeaway') THEN
    RAISE EXCEPTION 'invalid_payload';
  END IF;

  v_coupon_code := NULLIF(upper(btrim(COALESCE(payload->>'coupon_code', ''))), '');
  v_customer_phone := NULLIF(btrim(COALESCE(payload->>'customer_phone', '')), '');
  v_client_ip := NULLIF(btrim(COALESCE(payload->>'client_ip', '')), '');

  IF jsonb_typeof(payload->'items') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'empty_cart';
  END IF;

  v_item_count := jsonb_array_length(payload->'items');
  IF v_item_count IS NULL OR v_item_count < 1 OR v_item_count > 50 THEN
    RAISE EXCEPTION 'empty_cart';
  END IF;

  IF v_coupon_code IS NOT NULL THEN
    DELETE FROM public.coupon_preview_attempts
    WHERE created_at < now() - interval '1 hour';

    IF v_customer_phone IS NOT NULL THEN
      SELECT count(*) INTO v_phone_count
      FROM public.coupon_preview_attempts
      WHERE phone_key = v_customer_phone
        AND created_at > now() - interval '15 minutes';
      IF v_phone_count >= 20 THEN
        RAISE EXCEPTION 'rate_limited';
      END IF;
    END IF;

    IF v_client_ip IS NOT NULL THEN
      SELECT count(*) INTO v_ip_count
      FROM public.coupon_preview_attempts
      WHERE ip_key = v_client_ip
        AND created_at > now() - interval '15 minutes';
      IF v_ip_count >= 30 THEN
        RAISE EXCEPTION 'rate_limited';
      END IF;
    END IF;

    INSERT INTO public.coupon_preview_attempts (phone_key, ip_key)
    VALUES (v_customer_phone, v_client_ip);
  END IF;

  v_tax_rate := COALESCE((v_restaurant->>'tax_rate')::numeric, 15);
  v_service_rate := COALESCE((v_restaurant->>'service_charge_rate')::numeric, 10);
  v_apply_tax := COALESCE((v_restaurant->>'apply_tax')::boolean, true);
  v_apply_service := COALESCE((v_restaurant->>'apply_service_charge')::boolean, true);

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
        'quantity', v_qty,
        'unit_price', v_unit
      )
    );
  END LOOP;

  v_subtotal := round(v_subtotal, 2);
  v_resolved := public.evaluate_order_discounts(
    v_coupon_code, v_subtotal, v_customer_phone, false, v_lines
  );

  IF v_coupon_code IS NOT NULL
     AND COALESCE((v_resolved->>'valid')::boolean, false) IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', COALESCE(v_resolved->>'error', 'invalid_coupon'),
      'code', v_coupon_code,
      'discount_amount', 0,
      'subtotal', v_subtotal,
      'tax', 0,
      'service', 0,
      'total', v_subtotal,
      'applications', '[]'::jsonb
    );
  END IF;

  IF COALESCE((v_resolved->>'valid')::boolean, false) IS TRUE THEN
    v_discount := COALESCE((v_resolved->>'discount_amount')::numeric, 0);
  END IF;

  v_taxable := round(v_subtotal - v_discount, 2);
  IF v_apply_tax THEN
    v_tax := round(v_taxable * (v_tax_rate / 100.0), 2);
  END IF;
  IF v_apply_service THEN
    v_service := round(v_taxable * (v_service_rate / 100.0), 2);
  END IF;
  v_total := round(v_taxable + v_tax + v_service, 2);

  RETURN jsonb_build_object(
    'valid', true,
    'error', NULL,
    'code', v_resolved->>'code',
    'discount_type', v_resolved->>'discount_type',
    'discount_value', (v_resolved->>'discount_value')::numeric,
    'discount_amount', v_discount,
    'subtotal', v_subtotal,
    'tax', v_tax,
    'service', v_service,
    'total', v_total,
    'applications', COALESCE(v_resolved->'applications', '[]'::jsonb)
  );
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
  v_delivery_address_details text;
  v_delivery_location_id uuid;
  v_delivery_fee numeric := 0;
  v_location public.delivery_locations%ROWTYPE;
  v_location_name text;
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
  v_applications jsonb := '[]'::jsonb;
BEGIN
  SELECT value INTO v_features FROM public.settings WHERE key = 'features';
  IF COALESCE((v_features->>'dashboard_orders')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'feature_disabled';
  END IF;

  SELECT value INTO v_restaurant FROM public.settings WHERE key = 'restaurant';

  IF COALESCE((v_restaurant->>'accepting_orders')::boolean, true) IS NOT TRUE THEN
    RAISE EXCEPTION 'orders_closed';
  END IF;

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
  v_delivery_address := NULL;
  v_delivery_address_details := NULLIF(btrim(COALESCE(payload->>'delivery_address_details', '')), '');
  v_delivery_location_id := NULL;
  v_notes := NULLIF(btrim(COALESCE(payload->>'notes', '')), '');
  v_locale := COALESCE(NULLIF(payload->>'locale', ''), 'en');
  IF v_locale NOT IN ('en', 'ar', 'fr', 'nl') THEN
    v_locale := 'en';
  END IF;
  v_whatsapp_sent := COALESCE((payload->>'whatsapp_sent')::boolean, false);
  v_client_ip := NULLIF(btrim(COALESCE(payload->>'client_ip', '')), '');
  v_coupon_code := NULLIF(upper(btrim(COALESCE(payload->>'coupon_code', ''))), '');

  IF payload ? 'delivery_location_id'
     AND payload->>'delivery_location_id' IS NOT NULL
     AND btrim(payload->>'delivery_location_id') <> '' THEN
    BEGIN
      v_delivery_location_id := (payload->>'delivery_location_id')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'address_required';
    END;
  END IF;

  IF v_customer_name = '' OR char_length(v_customer_name) > 200 THEN
    RAISE EXCEPTION 'name_required';
  END IF;

  IF v_customer_phone IS NOT NULL AND char_length(v_customer_phone) > 40 THEN
    RAISE EXCEPTION 'invalid_payload';
  END IF;

  IF v_dining_mode = 'takeaway' AND v_fulfillment = 'delivery' THEN
    IF v_delivery_location_id IS NULL THEN
      RAISE EXCEPTION 'address_required';
    END IF;

    SELECT * INTO v_location
    FROM public.delivery_locations
    WHERE id = v_delivery_location_id
      AND is_active IS TRUE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'address_required';
    END IF;

    v_delivery_fee := round(COALESCE(v_location.delivery_fee, 0), 2);

    v_location_name := CASE v_locale
      WHEN 'ar' THEN v_location.name_ar
      WHEN 'fr' THEN COALESCE(v_location.name_fr, v_location.name_en)
      WHEN 'nl' THEN COALESCE(v_location.name_nl, v_location.name_en)
      ELSE v_location.name_en
    END;

    v_delivery_address := v_location_name;
    IF v_delivery_address_details IS NOT NULL THEN
      v_delivery_address := v_delivery_address || E'\n' || v_delivery_address_details;
    END IF;
  END IF;

  IF v_delivery_address IS NOT NULL AND char_length(v_delivery_address) > 500 THEN
    RAISE EXCEPTION 'invalid_payload';
  END IF;

  IF v_delivery_address_details IS NOT NULL AND char_length(v_delivery_address_details) > 400 THEN
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
  IF v_dining_mode = 'takeaway' AND v_fulfillment = 'delivery' AND v_delivery_location_id IS NOT NULL THEN
    IF COALESCE(v_location.minimum_order, 0) > 0 THEN
      v_min_order := v_location.minimum_order;
    END IF;
  END IF;
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

  IF COALESCE((v_features->>'coupons')::boolean, false) IS TRUE THEN
    v_resolved := public.evaluate_order_discounts(
      v_coupon_code, v_subtotal, v_customer_phone, true, v_lines
    );
    IF v_coupon_code IS NOT NULL
       AND COALESCE((v_resolved->>'valid')::boolean, false) IS NOT TRUE THEN
      RAISE EXCEPTION '%', COALESCE(v_resolved->>'error', 'invalid_coupon');
    END IF;
    IF COALESCE((v_resolved->>'valid')::boolean, false) IS TRUE THEN
      v_discount := COALESCE((v_resolved->>'discount_amount')::numeric, 0);
      v_coupon_id := NULLIF(v_resolved->>'coupon_id', '')::uuid;
      v_coupon_code := NULLIF(v_resolved->>'code', '');
      v_applications := COALESCE(v_resolved->'applications', '[]'::jsonb);
    END IF;
  ELSIF v_coupon_code IS NOT NULL THEN
    RAISE EXCEPTION 'invalid_coupon';
  END IF;

  v_taxable := round(v_subtotal - v_discount, 2);
  IF v_apply_tax THEN
    v_tax := round(v_taxable * (v_tax_rate / 100.0), 2);
  END IF;
  IF v_apply_service THEN
    v_service := round(v_taxable * (v_service_rate / 100.0), 2);
  END IF;
  v_total := round(v_taxable + v_tax + v_service + v_delivery_fee, 2);

  v_order_number := v_prefix || '-' || lpad(nextval('public.order_number_seq')::text, 4, '0');

  INSERT INTO public.orders (
    order_number, status, dining_mode, fulfillment_type, table_number,
    customer_name, customer_phone, delivery_address, delivery_location_id, notes,
    subtotal, tax, service, discount_amount, coupon_id, coupon_code,
    delivery_fee, total, currency, whatsapp_sent, locale
  ) VALUES (
    v_order_number, 'new', v_dining_mode, v_fulfillment, v_table_number,
    v_customer_name, v_customer_phone, v_delivery_address, v_delivery_location_id, v_notes,
    v_subtotal, v_tax, v_service, v_discount, v_coupon_id, v_coupon_code,
    v_delivery_fee, v_total, v_currency, v_whatsapp_sent, v_locale
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

  IF jsonb_typeof(v_applications) = 'array' AND jsonb_array_length(v_applications) > 0 THEN
    INSERT INTO public.coupon_redemptions (
      coupon_id, order_id, code_snapshot, discount_amount, phone_key
    )
    SELECT
      (x->>'coupon_id')::uuid,
      v_order_id,
      x->>'code',
      (x->>'discount_amount')::numeric,
      v_customer_phone
    FROM jsonb_array_elements(v_applications) AS x;

    UPDATE public.coupons c
    SET redeemed_count = c.redeemed_count + 1
    FROM jsonb_array_elements(v_applications) AS x
    WHERE c.id = (x->>'coupon_id')::uuid;
  END IF;

  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'tax', v_tax,
    'service', v_service,
    'discount_amount', v_discount,
    'coupon_code', v_coupon_code,
    'delivery_fee', v_delivery_fee,
    'total', v_total,
    'currency', v_currency
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.place_staff_order(payload jsonb)
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
  v_delivery_address_details text;
  v_delivery_location_id uuid;
  v_delivery_fee numeric := 0;
  v_location public.delivery_locations%ROWTYPE;
  v_location_name text;
  v_notes text;
  v_locale text;
  v_coupon_code text;
  v_qty integer;
  v_size text;
  v_weight integer;
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
  v_currency text;
  v_prefix text;
  v_order_id uuid;
  v_order_number text;
  v_lines jsonb := '[]'::jsonb;
  v_item_notes text;
  v_resolved jsonb;
  v_coupon_id uuid;
  v_applications jsonb := '[]'::jsonb;
  v_rec record;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

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
  v_delivery_address := NULL;
  v_delivery_address_details := NULLIF(btrim(COALESCE(payload->>'delivery_address_details', '')), '');
  v_delivery_location_id := NULL;
  v_notes := NULLIF(btrim(COALESCE(payload->>'notes', '')), '');
  v_locale := COALESCE(NULLIF(payload->>'locale', ''), 'en');
  IF v_locale NOT IN ('en', 'ar', 'fr', 'nl') THEN
    v_locale := 'en';
  END IF;
  v_coupon_code := NULLIF(upper(btrim(COALESCE(payload->>'coupon_code', ''))), '');

  IF payload ? 'delivery_location_id'
     AND payload->>'delivery_location_id' IS NOT NULL
     AND btrim(payload->>'delivery_location_id') <> '' THEN
    BEGIN
      v_delivery_location_id := (payload->>'delivery_location_id')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'address_required';
    END;
  END IF;

  IF v_customer_name = '' OR char_length(v_customer_name) > 200 THEN
    RAISE EXCEPTION 'name_required';
  END IF;

  IF v_customer_phone IS NOT NULL AND char_length(v_customer_phone) > 40 THEN
    RAISE EXCEPTION 'invalid_payload';
  END IF;

  IF v_dining_mode = 'takeaway' AND v_fulfillment = 'delivery' THEN
    IF v_delivery_location_id IS NULL THEN
      RAISE EXCEPTION 'address_required';
    END IF;

    SELECT * INTO v_location
    FROM public.delivery_locations
    WHERE id = v_delivery_location_id
      AND is_active IS TRUE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'address_required';
    END IF;

    v_delivery_fee := round(COALESCE(v_location.delivery_fee, 0), 2);

    v_location_name := CASE v_locale
      WHEN 'ar' THEN v_location.name_ar
      WHEN 'fr' THEN COALESCE(v_location.name_fr, v_location.name_en)
      WHEN 'nl' THEN COALESCE(v_location.name_nl, v_location.name_en)
      ELSE v_location.name_en
    END;

    v_delivery_address := v_location_name;
    IF v_delivery_address_details IS NOT NULL THEN
      v_delivery_address := v_delivery_address || E'\n' || v_delivery_address_details;
    END IF;
  END IF;

  IF v_delivery_address IS NOT NULL AND char_length(v_delivery_address) > 500 THEN
    RAISE EXCEPTION 'invalid_payload';
  END IF;

  IF v_delivery_address_details IS NOT NULL AND char_length(v_delivery_address_details) > 400 THEN
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

  v_tax_rate := COALESCE((v_restaurant->>'tax_rate')::numeric, 15);
  v_service_rate := COALESCE((v_restaurant->>'service_charge_rate')::numeric, 10);
  v_apply_tax := COALESCE((v_restaurant->>'apply_tax')::boolean, true);
  v_apply_service := COALESCE((v_restaurant->>'apply_service_charge')::boolean, true);
  v_min_order := COALESCE((v_restaurant->>'minimum_order')::numeric, 0);
  IF v_dining_mode = 'takeaway' AND v_fulfillment = 'delivery' AND v_delivery_location_id IS NOT NULL THEN
    IF COALESCE(v_location.minimum_order, 0) > 0 THEN
      v_min_order := v_location.minimum_order;
    END IF;
  END IF;
  v_currency := COALESCE(NULLIF(v_restaurant->>'currency', ''), 'EGP');
  v_prefix := upper(COALESCE(NULLIF(v_features->>'order_prefix', ''), 'ORD'));

  FOR v_rec IN
    SELECT
      e.value AS item,
      p.id AS product_id,
      p.name_ar,
      p.name_en,
      p.name_fr,
      p.name_nl,
      p.dining_price,
      p.takeaway_price,
      p.has_size_options,
      p.price_per_kg,
      p.is_available
    FROM jsonb_array_elements(payload->'items') WITH ORDINALITY AS e(value, ordinality)
    LEFT JOIN public.products p
      ON p.id = CASE
        WHEN (e.value->>'product_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN (e.value->>'product_id')::uuid
        ELSE NULL
      END
    ORDER BY e.ordinality
  LOOP
    v_qty := COALESCE((v_rec.item->>'quantity')::integer, 0);
    IF v_qty < 1 OR v_qty > 99 THEN
      RAISE EXCEPTION 'invalid_payload';
    END IF;

    v_size := NULLIF(v_rec.item->>'size_option', '');
    IF v_size IS NOT NULL AND v_size NOT IN ('small', 'large') THEN
      RAISE EXCEPTION 'invalid_payload';
    END IF;

    BEGIN
      v_weight := NULLIF((v_rec.item->>'weight_grams')::integer, 0);
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'invalid_payload';
    END;

    IF v_weight IS NOT NULL AND (v_weight < 1 OR v_weight > 10000) THEN
      RAISE EXCEPTION 'invalid_payload';
    END IF;

    IF v_rec.product_id IS NULL OR v_rec.is_available IS NOT TRUE THEN
      RAISE EXCEPTION 'product_unavailable';
    END IF;

    v_item_notes := NULLIF(btrim(COALESCE(v_rec.item->>'notes', '')), '');
    IF v_item_notes IS NOT NULL AND char_length(v_item_notes) > v_max_notes THEN
      RAISE EXCEPTION 'notes_too_long';
    END IF;

    IF v_weight IS NOT NULL AND v_rec.price_per_kg IS NOT NULL THEN
      v_unit := round(v_rec.price_per_kg * v_weight / 1000.0);
    ELSIF v_rec.has_size_options IS TRUE AND v_size = 'small' THEN
      v_unit := v_rec.dining_price;
    ELSIF v_rec.has_size_options IS TRUE AND v_size = 'large' THEN
      v_unit := v_rec.takeaway_price;
    ELSIF v_dining_mode = 'takeaway' THEN
      v_unit := v_rec.takeaway_price;
    ELSE
      v_unit := v_rec.dining_price;
    END IF;

    v_subtotal := v_subtotal + (v_unit * v_qty);

    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_rec.product_id,
        'name_ar', v_rec.name_ar,
        'name_en', v_rec.name_en,
        'name_fr', v_rec.name_fr,
        'name_nl', v_rec.name_nl,
        'quantity', v_qty,
        'unit_price', v_unit,
        'size_option', v_size,
        'weight_grams', v_weight,
        'notes', v_item_notes
      )
    );
  END LOOP;

  v_subtotal := round(v_subtotal, 2);
  IF v_min_order > 0 AND v_subtotal < v_min_order THEN
    RAISE EXCEPTION 'min_order';
  END IF;

  IF COALESCE((v_features->>'coupons')::boolean, false) IS TRUE THEN
    v_resolved := public.evaluate_order_discounts(
      v_coupon_code, v_subtotal, v_customer_phone, true, v_lines
    );
    IF v_coupon_code IS NOT NULL
       AND COALESCE((v_resolved->>'valid')::boolean, false) IS NOT TRUE THEN
      RAISE EXCEPTION '%', COALESCE(v_resolved->>'error', 'invalid_coupon');
    END IF;
    IF COALESCE((v_resolved->>'valid')::boolean, false) IS TRUE THEN
      v_discount := COALESCE((v_resolved->>'discount_amount')::numeric, 0);
      v_coupon_id := NULLIF(v_resolved->>'coupon_id', '')::uuid;
      v_coupon_code := NULLIF(v_resolved->>'code', '');
      v_applications := COALESCE(v_resolved->'applications', '[]'::jsonb);
    END IF;
  ELSIF v_coupon_code IS NOT NULL THEN
    RAISE EXCEPTION 'invalid_coupon';
  END IF;

  v_taxable := round(v_subtotal - v_discount, 2);
  IF v_apply_tax THEN
    v_tax := round(v_taxable * (v_tax_rate / 100.0), 2);
  END IF;
  IF v_apply_service THEN
    v_service := round(v_taxable * (v_service_rate / 100.0), 2);
  END IF;
  v_total := round(v_taxable + v_tax + v_service + v_delivery_fee, 2);

  v_order_number := v_prefix || '-' || lpad(nextval('public.order_number_seq')::text, 4, '0');

  INSERT INTO public.orders (
    order_number, status, dining_mode, fulfillment_type, table_number,
    customer_name, customer_phone, delivery_address, delivery_location_id, notes,
    subtotal, tax, service, discount_amount, coupon_id, coupon_code,
    delivery_fee, total, currency, whatsapp_sent, locale
  ) VALUES (
    v_order_number, 'new', v_dining_mode, v_fulfillment, v_table_number,
    v_customer_name, v_customer_phone, v_delivery_address, v_delivery_location_id, v_notes,
    v_subtotal, v_tax, v_service, v_discount, v_coupon_id, v_coupon_code,
    v_delivery_fee, v_total, v_currency, true, v_locale
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id, product_id, name_ar, name_en, name_fr, name_nl,
    quantity, unit_price, size_option, weight_grams, notes
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
    x.weight_grams,
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
    weight_grams integer,
    notes text
  );

  IF jsonb_typeof(v_applications) = 'array' AND jsonb_array_length(v_applications) > 0 THEN
    INSERT INTO public.coupon_redemptions (
      coupon_id, order_id, code_snapshot, discount_amount, phone_key
    )
    SELECT
      (x->>'coupon_id')::uuid,
      v_order_id,
      x->>'code',
      (x->>'discount_amount')::numeric,
      v_customer_phone
    FROM jsonb_array_elements(v_applications) AS x;

    UPDATE public.coupons c
    SET redeemed_count = c.redeemed_count + 1
    FROM jsonb_array_elements(v_applications) AS x
    WHERE c.id = (x->>'coupon_id')::uuid;
  END IF;

  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'tax', v_tax,
    'service', v_service,
    'discount_amount', v_discount,
    'coupon_code', v_coupon_code,
    'delivery_fee', v_delivery_fee,
    'total', v_total,
    'currency', v_currency
  );
END;
$$;

REVOKE ALL ON FUNCTION public.coupon_compute_amount(public.coupons, jsonb, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.coupon_gate_error(public.coupons, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_coupon_discount(text, numeric, text, boolean, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.evaluate_order_discounts(text, numeric, text, boolean, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.preview_customer_coupon(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.place_customer_order(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.place_staff_order(jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.preview_customer_coupon(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_customer_order(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_staff_order(jsonb) TO authenticated;
