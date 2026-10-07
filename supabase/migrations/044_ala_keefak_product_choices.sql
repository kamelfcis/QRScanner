-- Ala Keefak: dynamic product choice groups + order snapshot
-- Version: 044
-- Date: 2026-10-07
-- Apply only on Ala Keefak (pytmkruoyyhxfktnkpuu).

CREATE TABLE IF NOT EXISTS public.product_option_groups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  selection_type text NOT NULL DEFAULT 'single',
  min_select integer NOT NULL DEFAULT 0,
  max_select integer NOT NULL DEFAULT 1,
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_option_groups_selection_type_check
    CHECK (selection_type IN ('single', 'multi')),
  CONSTRAINT product_option_groups_min_select_check
    CHECK (min_select >= 0),
  CONSTRAINT product_option_groups_max_select_check
    CHECK (max_select >= 1),
  CONSTRAINT product_option_groups_min_max_check
    CHECK (min_select <= max_select)
);

CREATE INDEX IF NOT EXISTS idx_product_option_groups_product
  ON public.product_option_groups (product_id, sort_order);

CREATE TABLE IF NOT EXISTS public.product_option_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid NOT NULL REFERENCES public.product_option_groups(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  price_delta numeric(10, 2) NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_option_items_group
  ON public.product_option_items (group_id, sort_order);

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS selected_options jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.extract_selected_option_item_ids(p_selected jsonb)
RETURNS uuid[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(DISTINCT (x->>'item_id')::uuid),
    '{}'::uuid[]
  )
  FROM jsonb_array_elements(
    CASE
      WHEN p_selected IS NULL OR jsonb_typeof(p_selected) <> 'array' THEN '[]'::jsonb
      ELSE p_selected
    END
  ) AS x
  WHERE x ? 'item_id'
    AND (x->>'item_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
$$;

CREATE OR REPLACE FUNCTION public.build_selected_options_snapshot(
  p_product_id uuid,
  p_selected jsonb
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH ids AS (
    SELECT unnest(public.extract_selected_option_item_ids(p_selected)) AS item_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'group_id', g.id,
        'group_name_ar', g.name_ar,
        'group_name_en', g.name_en,
        'item_id', i.id,
        'name_ar', i.name_ar,
        'name_en', i.name_en,
        'price_delta', i.price_delta
      )
      ORDER BY g.sort_order, i.sort_order
    ),
    '[]'::jsonb
  )
  FROM public.product_option_items i
  JOIN public.product_option_groups g ON g.id = i.group_id
  JOIN ids ON ids.item_id = i.id
  WHERE g.product_id = p_product_id
    AND i.is_available IS TRUE;
$$;

CREATE OR REPLACE FUNCTION public.resolve_product_choices_price(
  p_product_id uuid,
  p_selected jsonb
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_group record;
  v_count integer;
  v_delta numeric := 0;
  v_selected_ids uuid[];
  v_valid_count integer;
  v_requested_count integer;
BEGIN
  v_selected_ids := public.extract_selected_option_item_ids(p_selected);
  v_requested_count := COALESCE(array_length(v_selected_ids, 1), 0);

  IF v_requested_count > 0 THEN
    SELECT count(DISTINCT i.id), COALESCE(sum(i.price_delta), 0)
      INTO v_valid_count, v_delta
    FROM public.product_option_items i
    JOIN public.product_option_groups g ON g.id = i.group_id
    WHERE g.product_id = p_product_id
      AND i.id = ANY(v_selected_ids)
      AND i.is_available IS TRUE;

    IF v_valid_count <> v_requested_count THEN
      RAISE EXCEPTION 'invalid_payload';
    END IF;
  END IF;

  FOR v_group IN
    SELECT *
    FROM public.product_option_groups
    WHERE product_id = p_product_id
    ORDER BY sort_order, id
  LOOP
    SELECT count(*)
      INTO v_count
    FROM public.product_option_items i
    WHERE i.group_id = v_group.id
      AND i.id = ANY(v_selected_ids)
      AND i.is_available IS TRUE;

    IF v_group.is_required AND v_count = 0 THEN
      RAISE EXCEPTION 'invalid_payload';
    END IF;

    IF v_group.selection_type = 'single' AND v_count > 1 THEN
      RAISE EXCEPTION 'invalid_payload';
    END IF;

    IF v_count < COALESCE(v_group.min_select, 0) THEN
      RAISE EXCEPTION 'invalid_payload';
    END IF;

    IF v_count > COALESCE(v_group.max_select, 1) THEN
      RAISE EXCEPTION 'invalid_payload';
    END IF;
  END LOOP;

  RETURN round(COALESCE(v_delta, 0), 2);
END;
$$;

ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read product option groups"
  ON public.product_option_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = product_id
        AND p.is_available IS TRUE
    )
  );

CREATE POLICY "Staff select product option groups"
  ON public.product_option_groups FOR SELECT TO authenticated
  USING (public.staff_can('menu', 'view') OR public.staff_can('kitchen', 'update'));

CREATE POLICY "Staff insert product option groups"
  ON public.product_option_groups FOR INSERT TO authenticated
  WITH CHECK (public.staff_can('menu', 'create'));

CREATE POLICY "Staff update product option groups"
  ON public.product_option_groups FOR UPDATE TO authenticated
  USING (public.staff_can('menu', 'update'))
  WITH CHECK (public.staff_can('menu', 'update'));

CREATE POLICY "Staff delete product option groups"
  ON public.product_option_groups FOR DELETE TO authenticated
  USING (public.staff_can('menu', 'delete'));

CREATE POLICY "Public read product option items"
  ON public.product_option_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.product_option_groups g
      JOIN public.products p ON p.id = g.product_id
      WHERE g.id = group_id
        AND p.is_available IS TRUE
        AND product_option_items.is_available IS TRUE
    )
  );

CREATE POLICY "Staff select product option items"
  ON public.product_option_items FOR SELECT TO authenticated
  USING (public.staff_can('menu', 'view') OR public.staff_can('kitchen', 'update'));

CREATE POLICY "Staff insert product option items"
  ON public.product_option_items FOR INSERT TO authenticated
  WITH CHECK (public.staff_can('menu', 'create'));

CREATE POLICY "Staff update product option items"
  ON public.product_option_items FOR UPDATE TO authenticated
  USING (public.staff_can('menu', 'update'))
  WITH CHECK (public.staff_can('menu', 'update'));

CREATE POLICY "Staff delete product option items"
  ON public.product_option_items FOR DELETE TO authenticated
  USING (public.staff_can('menu', 'delete'));

REVOKE ALL ON FUNCTION public.extract_selected_option_item_ids(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.build_selected_options_snapshot(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_product_choices_price(uuid, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.extract_selected_option_item_ids(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.build_selected_options_snapshot(uuid, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_product_choices_price(uuid, jsonb) TO anon, authenticated;

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
  v_qty integer;
  v_size text;
  v_unit numeric;
  v_options_delta numeric;
  v_options_snapshot jsonb;
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
  v_rec record;
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
      p.price_medium,
      p.price_family,
      p.size_small_enabled,
      p.size_medium_enabled,
      p.size_large_enabled,
      p.size_family_enabled,
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
    IF v_size IS NOT NULL AND v_size NOT IN ('small', 'medium', 'large', 'family') THEN
      RAISE EXCEPTION 'invalid_payload';
    END IF;

    IF v_rec.product_id IS NULL OR v_rec.is_available IS NOT TRUE THEN
      RAISE EXCEPTION 'product_unavailable';
    END IF;

    v_item_notes := NULLIF(btrim(COALESCE(v_rec.item->>'notes', '')), '');
    IF v_item_notes IS NOT NULL AND char_length(v_item_notes) > v_max_notes THEN
      RAISE EXCEPTION 'notes_too_long';
    END IF;

    v_unit := public.resolve_product_size_unit_price(
      v_rec.has_size_options,
      v_size,
      v_dining_mode,
      v_rec.dining_price,
      v_rec.takeaway_price,
      v_rec.price_medium,
      v_rec.price_family,
      v_rec.size_small_enabled,
      v_rec.size_medium_enabled,
      v_rec.size_large_enabled,
      v_rec.size_family_enabled
    );

    v_options_delta := public.resolve_product_choices_price(
      v_rec.product_id,
      COALESCE(v_rec.item->'selected_options', '[]'::jsonb)
    );
    v_options_snapshot := public.build_selected_options_snapshot(
      v_rec.product_id,
      COALESCE(v_rec.item->'selected_options', '[]'::jsonb)
    );

    v_unit := round(v_unit + v_options_delta, 2);
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
        'notes', v_item_notes,
        'selected_options', v_options_snapshot
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
    quantity, unit_price, size_option, notes, selected_options
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
    x.notes,
    COALESCE(x.selected_options, '[]'::jsonb)
  FROM jsonb_to_recordset(v_lines) AS x(
    product_id uuid,
    name_ar text,
    name_en text,
    name_fr text,
    name_nl text,
    quantity integer,
    unit_price numeric,
    size_option text,
    notes text,
    selected_options jsonb
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

COMMENT ON TABLE public.product_option_groups IS 'Ala Keefak: per-product choice groups (e.g. bread type, toppings).';
COMMENT ON TABLE public.product_option_items IS 'Ala Keefak: choices within a group with optional price delta.';
COMMENT ON COLUMN public.order_items.selected_options IS 'Snapshot of selected option items at order time.';
COMMENT ON FUNCTION public.resolve_product_choices_price(uuid, jsonb) IS 'Validate selections and sum price deltas for one product line.';
