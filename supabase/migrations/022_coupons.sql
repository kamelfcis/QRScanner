-- Checkout coupons: one code per order, server-side evaluation
-- Version: 022
-- Date: 2026-08-21
-- Feature flag settings.features.coupons defaults to false (enable per-restaurant).
-- Coupons table is NOT granted to anon. Preview + apply go through RPCs only.

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(32) NOT NULL,
  discount_type VARCHAR(16) NOT NULL,
  discount_value NUMERIC(10, 2) NOT NULL,
  min_subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  max_discount NUMERIC(10, 2),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  max_redemptions INTEGER,
  per_phone_limit INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  redeemed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT coupons_code_unique UNIQUE (code),
  CONSTRAINT coupons_code_format_check CHECK (code ~ '^[A-Z0-9][A-Z0-9_-]{1,31}$'),
  CONSTRAINT coupons_type_check CHECK (discount_type IN ('percentage', 'fixed')),
  CONSTRAINT coupons_value_check CHECK (
    discount_value > 0
    AND (
      (discount_type = 'percentage' AND discount_value <= 100)
      OR discount_type = 'fixed'
    )
  ),
  CONSTRAINT coupons_min_subtotal_check CHECK (min_subtotal >= 0),
  CONSTRAINT coupons_max_discount_check CHECK (max_discount IS NULL OR max_discount >= 0),
  CONSTRAINT coupons_max_redemptions_check CHECK (max_redemptions IS NULL OR max_redemptions >= 1),
  CONSTRAINT coupons_per_phone_check CHECK (per_phone_limit >= 1),
  CONSTRAINT coupons_redeemed_check CHECK (redeemed_count >= 0),
  CONSTRAINT coupons_window_check CHECK (
    starts_at IS NULL OR ends_at IS NULL OR ends_at >= starts_at
  )
);

CREATE INDEX IF NOT EXISTS idx_coupons_active_window
  ON public.coupons (is_active, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  code_snapshot VARCHAR(32) NOT NULL,
  discount_amount NUMERIC(10, 2) NOT NULL,
  phone_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT coupon_redemptions_order_unique UNIQUE (order_id),
  CONSTRAINT coupon_redemptions_amount_check CHECK (discount_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon
  ON public.coupon_redemptions (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_phone
  ON public.coupon_redemptions (coupon_id, phone_key)
  WHERE phone_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.coupon_preview_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_key TEXT,
  ip_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupon_preview_attempts_phone
  ON public.coupon_preview_attempts (phone_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coupon_preview_attempts_ip
  ON public.coupon_preview_attempts (ip_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coupon_preview_attempts_created
  ON public.coupon_preview_attempts (created_at);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(32),
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_coupon_id
  ON public.orders (coupon_id)
  WHERE coupon_id IS NOT NULL;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_money_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_money_check CHECK (
    subtotal >= 0
    AND tax >= 0
    AND service >= 0
    AND discount_amount >= 0
    AND total >= 0
  );

DROP TRIGGER IF EXISTS update_coupons_updated_at ON public.coupons;
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION public.normalize_coupon_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.code := upper(btrim(NEW.code));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS coupons_normalize_code ON public.coupons;
CREATE TRIGGER coupons_normalize_code
  BEFORE INSERT OR UPDATE OF code ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.normalize_coupon_code();

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
  NEW.total := OLD.total;
  NEW.currency := OLD.currency;
  NEW.locale := OLD.locale;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_coupon_discount(
  p_code text,
  p_subtotal numeric,
  p_phone text,
  p_lock boolean
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
  v_phone_uses integer := 0;
BEGIN
  v_code := upper(btrim(COALESCE(p_code, '')));
  IF v_code = '' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'invalid_coupon');
  END IF;

  IF p_lock THEN
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE code = v_code
    FOR UPDATE;
  ELSE
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE code = v_code;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'invalid_coupon');
  END IF;

  IF v_coupon.is_active IS NOT TRUE THEN
    RETURN jsonb_build_object('valid', false, 'error', 'inactive');
  END IF;

  IF (v_coupon.starts_at IS NOT NULL AND now() < v_coupon.starts_at)
     OR (v_coupon.ends_at IS NOT NULL AND now() > v_coupon.ends_at) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'expired');
  END IF;

  IF v_coupon.max_redemptions IS NOT NULL
     AND v_coupon.redeemed_count >= v_coupon.max_redemptions THEN
    RETURN jsonb_build_object('valid', false, 'error', 'usage_exhausted');
  END IF;

  IF p_subtotal < v_coupon.min_subtotal THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'min_order',
      'min_subtotal', v_coupon.min_subtotal
    );
  END IF;

  IF p_phone IS NOT NULL AND p_phone <> '' THEN
    SELECT count(*) INTO v_phone_uses
    FROM public.coupon_redemptions
    WHERE coupon_id = v_coupon.id
      AND phone_key = p_phone;
    IF v_phone_uses >= v_coupon.per_phone_limit THEN
      RETURN jsonb_build_object('valid', false, 'error', 'phone_limit');
    END IF;
  END IF;

  IF v_coupon.discount_type = 'percentage' THEN
    v_discount := round(p_subtotal * (v_coupon.discount_value / 100.0), 2);
  ELSE
    v_discount := round(v_coupon.discount_value, 2);
  END IF;

  IF v_coupon.max_discount IS NOT NULL THEN
    v_discount := least(v_discount, v_coupon.max_discount);
  END IF;

  v_discount := round(greatest(least(v_discount, p_subtotal), 0), 2);

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'discount_amount', v_discount
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
  END LOOP;

  v_subtotal := round(v_subtotal, 2);
  v_resolved := public.resolve_coupon_discount(v_coupon_code, v_subtotal, v_customer_phone, false);

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
    'valid', COALESCE((v_resolved->>'valid')::boolean, false),
    'error', v_resolved->>'error',
    'code', v_resolved->>'code',
    'discount_type', v_resolved->>'discount_type',
    'discount_value', (v_resolved->>'discount_value')::numeric,
    'discount_amount', v_discount,
    'subtotal', v_subtotal,
    'tax', v_tax,
    'service', v_service,
    'total', v_total
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
    total, currency, whatsapp_sent, locale
  ) VALUES (
    v_order_number, 'new', v_dining_mode, v_fulfillment, v_table_number,
    v_customer_name, v_customer_phone, v_delivery_address, v_notes,
    v_subtotal, v_tax, v_service, v_discount, v_coupon_id, v_coupon_code,
    v_total, v_currency, v_whatsapp_sent, v_locale
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
    'total', v_total,
    'currency', v_currency
  );
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_coupon_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_coupon_discount(text, numeric, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.preview_customer_coupon(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.place_customer_order(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_order_immutable_fields() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.preview_customer_coupon(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_customer_order(jsonb) TO anon, authenticated;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_preview_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff select coupons" ON public.coupons;
CREATE POLICY "Staff select coupons"
  ON public.coupons FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Staff insert coupons" ON public.coupons;
CREATE POLICY "Staff insert coupons"
  ON public.coupons FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Staff update coupons" ON public.coupons;
CREATE POLICY "Staff update coupons"
  ON public.coupons FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Staff delete coupons" ON public.coupons;
CREATE POLICY "Staff delete coupons"
  ON public.coupons FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Staff select coupon_redemptions" ON public.coupon_redemptions;
CREATE POLICY "Staff select coupon_redemptions"
  ON public.coupon_redemptions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT SELECT ON public.coupon_redemptions TO authenticated;

INSERT INTO public.settings (key, value)
VALUES (
  'features',
  '{"coupons": false}'::jsonb
)
ON CONFLICT (key) DO UPDATE
SET value = public.settings.value
  || jsonb_build_object(
    'coupons',
    COALESCE((public.settings.value->>'coupons')::boolean, false)
  ),
  updated_at = now();
