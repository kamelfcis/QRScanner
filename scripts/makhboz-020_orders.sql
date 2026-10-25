-- Makhboz VPS: kitchen order board (from ala-keefak 019-026, adapted)
-- Apply: psql -U postgres -d makhboz -v ON_ERROR_STOP=1 -f makhboz-020_orders.sql


-- ===== 019_orders.sql =====
-- Kitchen order board: persist customer checkouts for staff realtime
-- Version: 019
-- Date: 2026-08-15
-- Feature flag dashboard_orders defaults to false (enable per-restaurant via service role).

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(32) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  dining_mode VARCHAR(20) NOT NULL,
  fulfillment_type VARCHAR(20),
  table_number VARCHAR(50),
  customer_name VARCHAR(200) NOT NULL,
  customer_phone VARCHAR(40),
  delivery_address TEXT,
  notes TEXT,
  subtotal NUMERIC(10, 2) NOT NULL,
  tax NUMERIC(10, 2) NOT NULL DEFAULT 0,
  service NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'EGP',
  whatsapp_sent BOOLEAN NOT NULL DEFAULT false,
  locale VARCHAR(8) NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT orders_status_check CHECK (
    status IN ('new', 'preparing', 'ready', 'completed', 'cancelled')
  ),
  CONSTRAINT orders_dining_mode_check CHECK (dining_mode IN ('dining', 'takeaway')),
  CONSTRAINT orders_fulfillment_check CHECK (
    fulfillment_type IS NULL OR fulfillment_type IN ('pickup', 'delivery')
  ),
  CONSTRAINT orders_locale_check CHECK (locale IN ('en', 'ar', 'fr', 'nl')),
  CONSTRAINT orders_money_check CHECK (
    subtotal >= 0 AND tax >= 0 AND service >= 0 AND total >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_whatsapp_sent ON public.orders (whatsapp_sent)
  WHERE whatsapp_sent = false;

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  name_fr VARCHAR(255),
  name_nl VARCHAR(255),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  size_option VARCHAR(16),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT order_items_quantity_check CHECK (quantity >= 1 AND quantity <= 99),
  CONSTRAINT order_items_unit_price_check CHECK (unit_price >= 0),
  CONSTRAINT order_items_size_check CHECK (
    size_option IS NULL OR size_option IN ('small', 'large')
  )
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items (order_id);

CREATE TABLE IF NOT EXISTS public.order_place_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_key TEXT,
  ip_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_place_attempts_phone
  ON public.order_place_attempts (phone_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_place_attempts_ip
  ON public.order_place_attempts (ip_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_place_attempts_created
  ON public.order_place_attempts (created_at);

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
  NEW.total := OLD.total;
  NEW.currency := OLD.currency;
  NEW.locale := OLD.locale;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_orders_immutable ON public.orders;
CREATE TRIGGER protect_orders_immutable
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.protect_order_immutable_fields();

CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (type, title, message, data)
  VALUES (
    'new_order',
    'New order ' || NEW.order_number,
    NEW.customer_name,
    jsonb_build_object(
      'order_id', NEW.id,
      'order_number', NEW.order_number,
      'total', NEW.total,
      'dining_mode', NEW.dining_mode
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_notify_new ON public.orders;
CREATE TRIGGER orders_notify_new
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_order();

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
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_qty integer;
  v_size text;
  v_unit numeric;
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_service numeric := 0;
  v_total numeric := 0;
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

  IF v_apply_tax THEN
    v_tax := round(v_subtotal * (v_tax_rate / 100.0), 2);
  END IF;
  IF v_apply_service THEN
    v_service := round(v_subtotal * (v_service_rate / 100.0), 2);
  END IF;
  v_total := round(v_subtotal + v_tax + v_service, 2);

  v_order_number := v_prefix || '-' || lpad(nextval('public.order_number_seq')::text, 4, '0');

  INSERT INTO public.orders (
    order_number, status, dining_mode, fulfillment_type, table_number,
    customer_name, customer_phone, delivery_address, notes,
    subtotal, tax, service, total, currency, whatsapp_sent, locale
  ) VALUES (
    v_order_number, 'new', v_dining_mode, v_fulfillment, v_table_number,
    v_customer_name, v_customer_phone, v_delivery_address, v_notes,
    v_subtotal, v_tax, v_service, v_total, v_currency, v_whatsapp_sent, v_locale
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

  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'tax', v_tax,
    'service', v_service,
    'total', v_total,
    'currency', v_currency
  );
END;
$$;

REVOKE ALL ON FUNCTION public.place_customer_order(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_new_order() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_order_immutable_fields() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_customer_order(jsonb) TO anon, authenticated;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_place_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff select orders" ON public.orders;
CREATE POLICY "Staff select orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Staff update orders" ON public.orders;
CREATE POLICY "Staff update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Staff select order_items" ON public.order_items;
CREATE POLICY "Staff select order_items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;

-- (skipped supabase_realtime publication on VPS)

INSERT INTO public.settings (key, value)
VALUES (
  'features',
  '{"ai_product_images": false, "dashboard_orders": false, "order_prefix": "ORD"}'::jsonb
)
ON CONFLICT (key) DO UPDATE
SET value = public.settings.value
  || jsonb_build_object(
    'dashboard_orders',
    COALESCE((public.settings.value->>'dashboard_orders')::boolean, false)
  )
  || CASE
    WHEN public.settings.value ? 'order_prefix' THEN '{}'::jsonb
    ELSE jsonb_build_object('order_prefix', 'ORD')
  END,
  updated_at = now();

-- ===== 020_order_staff_acknowledged.sql =====
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

-- ===== 021_orders_delete.sql =====
-- Kitchen order board: staff hard delete (single + date range)
-- Version: 021
-- Date: 2026-08-15

DROP POLICY IF EXISTS "Staff delete orders" ON public.orders;
CREATE POLICY "Staff delete orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

GRANT DELETE ON public.orders TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_orders_in_range(
  p_from timestamptz,
  p_to timestamptz,
  p_statuses text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_ids uuid[];
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_from > p_to THEN
    RAISE EXCEPTION 'invalid_range';
  END IF;

  WITH deleted AS (
    DELETE FROM public.orders
    WHERE created_at >= p_from
      AND created_at < p_to + interval '1 day'
      AND (
        p_statuses IS NULL
        OR cardinality(p_statuses) = 0
        OR status = ANY (p_statuses)
      )
    RETURNING id
  )
  SELECT coalesce(array_agg(id), '{}'), count(*)::integer
  INTO v_deleted_ids, v_count
  FROM deleted;

  IF v_count > 0 THEN
    DELETE FROM public.notifications
    WHERE type = 'new_order'
      AND (data->>'order_id')::uuid = ANY (v_deleted_ids);
  END IF;

  RETURN jsonb_build_object('deleted_count', coalesce(v_count, 0));
END;
$$;

REVOKE ALL ON FUNCTION public.delete_orders_in_range(timestamptz, timestamptz, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_orders_in_range(timestamptz, timestamptz, text[]) TO authenticated;

-- ===== 022_coupons.sql =====
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

-- ===== 024_order_delivery_fee.sql =====
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

-- ===== 026_place_staff_order.sql =====
-- Staff POS: authenticated place_staff_order (no customer rate limits)
-- Version: 026
-- Date: 2026-09-16
-- Hettsamaka only. Server-prices items including kilo weights, delivery, coupons.

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS weight_grams INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'order_items_weight_grams_check'
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_weight_grams_check
      CHECK (weight_grams IS NULL OR (weight_grams >= 1 AND weight_grams <= 10000));
  END IF;
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
    'delivery_fee', v_delivery_fee,
    'total', v_total,
    'currency', v_currency
  );
END;
$$;

REVOKE ALL ON FUNCTION public.place_staff_order(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_staff_order(jsonb) TO authenticated;

COMMENT ON FUNCTION public.place_staff_order(jsonb) IS
  'Dashboard POS: authenticated staff create a kitchen ticket. Prices from products JOIN; never trust client totals.';


-- ===== Makhboz extras =====
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_location_id UUID REFERENCES public.delivery_locations(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ready_whatsapp_sent_at TIMESTAMPTZ;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS selected_size JSONB;

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_size_check;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_size_check
  CHECK (size_option IS NULL OR size_option IN ('small', 'medium', 'large', 'family'));

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_size_option_check;

-- Enable order board for Makhboz admin dashboard
UPDATE public.settings
SET
  value = COALESCE(value, '{}'::jsonb)
    || jsonb_build_object(
      'dashboard_orders', true,
      'order_prefix', COALESCE(value->>'order_prefix', 'MKB')
    ),
  updated_at = now()
WHERE key = 'features';

INSERT INTO public.settings (key, value)
VALUES ('features', '{"ai_product_images": false, "dashboard_orders": true, "order_prefix": "MKB", "coupons": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;
