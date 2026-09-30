-- Ostol POS: inventory, shifts, loyalty, offers (Ala Keefak / isAlaKeefakTenant UI only)
-- Version: 042
-- Date: 2026-09-30
-- Apply on Supabase mylxcokqjbaazlfdrnts only

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stock_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  sku TEXT,
  unit TEXT NOT NULL DEFAULT 'piece',
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  track_stock BOOLEAN NOT NULL DEFAULT true,
  avg_cost NUMERIC(12, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stock_levels (
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  qty NUMERIC(14, 4) NOT NULL DEFAULT 0,
  PRIMARY KEY (stock_item_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'recipe_consume', 'adjust', 'reverse')),
  qty_delta NUMERIC(14, 4) NOT NULL,
  unit_cost NUMERIC(12, 4) NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON public.stock_movements (stock_item_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  yield_qty NUMERIC(10, 4) NOT NULL DEFAULT 1 CHECK (yield_qty > 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recipe_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE RESTRICT,
  qty NUMERIC(12, 4) NOT NULL CHECK (qty > 0),
  UNIQUE (recipe_id, stock_item_id)
);

CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  invoice_number TEXT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  posted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_invoice_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES public.purchase_invoices(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE RESTRICT,
  qty NUMERIC(12, 4) NOT NULL CHECK (qty > 0),
  unit_cost NUMERIC(12, 4) NOT NULL CHECK (unit_cost >= 0)
);

CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  invoice_id UUID REFERENCES public.purchase_invoices(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  opening_notes TEXT,
  closing_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shifts_one_open
  ON public.shifts ((true))
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_shifts_opened_at ON public.shifts (opened_at DESC);

CREATE TABLE IF NOT EXISTS public.customers_public (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_normalized TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
  customer_id UUID PRIMARY KEY REFERENCES public.customers_public(id) ON DELETE CASCADE,
  points_balance INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loyalty_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers_public(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  points_delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_ledger_one_earn_per_order
  ON public.loyalty_ledger (order_id)
  WHERE reason = 'earn' AND order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.customer_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers_public(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title_ar TEXT,
  title_en TEXT,
  body_ar TEXT,
  body_en TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer
  ON public.customer_notifications (customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.product_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  offer_price NUMERIC(10, 2) NOT NULL CHECK (offer_price >= 0),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

ALTER TABLE public.product_offers DROP CONSTRAINT IF EXISTS product_offers_no_overlap;
ALTER TABLE public.product_offers ADD CONSTRAINT product_offers_no_overlap
  EXCLUDE USING gist (
    product_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (is_active);

CREATE TABLE IF NOT EXISTS public.customer_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers_public(id) ON DELETE CASCADE,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
  expires_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Existing table extensions
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers_public(id) ON DELETE SET NULL;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS product_offer_id UUID REFERENCES public.product_offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stock_short BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders (customer_id) WHERE customer_id IS NOT NULL;

-- Seed default warehouse (Ala Keefak main store)
INSERT INTO public.warehouses (name_ar, name_en, is_default)
SELECT 'المخزن الرئيسي', 'Main warehouse', true
WHERE NOT EXISTS (SELECT 1 FROM public.warehouses WHERE is_default IS TRUE);

-- ---------------------------------------------------------------------------
-- RLS (staff authenticated; customer reads via SECURITY DEFINER RPCs only)
-- ---------------------------------------------------------------------------

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers_public ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_offers ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'warehouses', 'stock_items', 'stock_levels', 'stock_movements',
    'recipes', 'recipe_lines', 'suppliers', 'purchase_invoices',
    'purchase_invoice_lines', 'supplier_payments', 'shifts',
    'customers_public', 'loyalty_accounts', 'loyalty_ledger',
    'customer_notifications', 'product_offers', 'customer_offers'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Staff select %I" ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "Staff select %I" ON public.%I FOR SELECT TO authenticated USING ((select auth.uid()) IS NOT NULL)',
      tbl, tbl
    );
    EXECUTE format('DROP POLICY IF EXISTS "Staff insert %I" ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "Staff insert %I" ON public.%I FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) IS NOT NULL)',
      tbl, tbl
    );
    EXECUTE format('DROP POLICY IF EXISTS "Staff update %I" ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "Staff update %I" ON public.%I FOR UPDATE TO authenticated USING ((select auth.uid()) IS NOT NULL) WITH CHECK ((select auth.uid()) IS NOT NULL)',
      tbl, tbl
    );
    EXECUTE format('DROP POLICY IF EXISTS "Staff delete %I" ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "Staff delete %I" ON public.%I FOR DELETE TO authenticated USING ((select auth.uid()) IS NOT NULL)',
      tbl, tbl
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
  END LOOP;
END $$;

-- Public read active product offers (menu pricing)
DROP POLICY IF EXISTS "Public read active product_offers" ON public.product_offers;
CREATE POLICY "Public read active product_offers"
  ON public.product_offers FOR SELECT
  TO anon, authenticated
  USING (
    is_active IS TRUE
    AND now() >= starts_at
    AND now() < ends_at
  );

GRANT SELECT ON public.product_offers TO anon;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.pos_default_warehouse_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT id FROM public.warehouses WHERE is_default IS TRUE ORDER BY created_at LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.pos_loyalty_settings()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT value FROM public.settings WHERE key = 'loyalty'),
    '{"enabled":true,"earn_per_100_egp":1}'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION public.pos_active_product_offer(p_product_id uuid)
RETURNS TABLE(offer_id uuid, offer_price numeric)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT po.id, po.offer_price
  FROM public.product_offers po
  WHERE po.product_id = p_product_id
    AND po.is_active IS TRUE
    AND now() >= po.starts_at
    AND now() < po.ends_at
  ORDER BY po.starts_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.assert_shift_open()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_shift_id uuid;
BEGIN
  SELECT id INTO v_shift_id
  FROM public.shifts
  WHERE status = 'open'
  ORDER BY opened_at DESC
  LIMIT 1;

  IF v_shift_id IS NULL THEN
    RAISE EXCEPTION 'shift_not_open';
  END IF;

  RETURN v_shift_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_apply_stock_delta(
  p_stock_item_id uuid,
  p_warehouse_id uuid,
  p_qty_delta numeric,
  p_unit_cost numeric,
  p_movement_type text,
  p_reference_type text,
  p_reference_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_new_qty numeric;
  v_avg numeric;
BEGIN
  INSERT INTO public.stock_levels (stock_item_id, warehouse_id, qty)
  VALUES (p_stock_item_id, p_warehouse_id, 0)
  ON CONFLICT (stock_item_id, warehouse_id) DO NOTHING;

  UPDATE public.stock_levels
  SET qty = qty + p_qty_delta
  WHERE stock_item_id = p_stock_item_id AND warehouse_id = p_warehouse_id
  RETURNING qty INTO v_new_qty;

  INSERT INTO public.stock_movements (
    stock_item_id, warehouse_id, movement_type, qty_delta, unit_cost,
    reference_type, reference_id, notes, created_by
  ) VALUES (
    p_stock_item_id, p_warehouse_id, p_movement_type, p_qty_delta, p_unit_cost,
    p_reference_type, p_reference_id, p_notes, auth.uid()
  );

  IF p_qty_delta > 0 THEN
    SELECT avg_cost INTO v_avg FROM public.stock_items WHERE id = p_stock_item_id;
    v_avg := round(
      (COALESCE(v_avg, 0) * (v_new_qty - p_qty_delta) + p_unit_cost * p_qty_delta)
      / NULLIF(v_new_qty, 0),
      4
    );
    UPDATE public.stock_items SET avg_cost = COALESCE(v_avg, p_unit_cost), updated_at = now()
    WHERE id = p_stock_item_id;
  END IF;

  RETURN v_new_qty;
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_apply_line_stock(p_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_item public.order_items%ROWTYPE;
  v_recipe public.recipes%ROWTYPE;
  v_line record;
  v_stock_item public.stock_items%ROWTYPE;
  v_wh uuid;
  v_scale numeric := 1;
  v_consume numeric;
  v_unit_cost numeric := 0;
  v_line_cost numeric := 0;
  v_stock_short boolean := false;
  v_level numeric;
BEGIN
  SELECT * INTO v_item FROM public.order_items WHERE id = p_item_id;
  IF NOT FOUND OR v_item.voided_at IS NOT NULL OR v_item.product_id IS NULL THEN
    RETURN;
  END IF;

  v_wh := public.pos_default_warehouse_id();
  IF v_wh IS NULL THEN RETURN; END IF;

  SELECT * INTO v_recipe FROM public.recipes WHERE product_id = v_item.product_id;
  IF FOUND THEN
    v_scale := v_item.quantity;
    IF v_item.weight_grams IS NOT NULL AND v_item.weight_grams > 0 THEN
      v_scale := v_scale * (v_item.weight_grams::numeric / v_recipe.yield_qty);
    END IF;

    FOR v_line IN
      SELECT rl.stock_item_id, rl.qty, si.track_stock, si.avg_cost
      FROM public.recipe_lines rl
      JOIN public.stock_items si ON si.id = rl.stock_item_id
      WHERE rl.recipe_id = v_recipe.id
    LOOP
      IF v_line.track_stock IS NOT TRUE THEN CONTINUE; END IF;
      v_consume := round(v_line.qty * v_scale, 4);
      v_level := public.pos_apply_stock_delta(
        v_line.stock_item_id, v_wh, -v_consume, v_line.avg_cost,
        'recipe_consume', 'order_item', p_item_id, NULL
      );
      v_line_cost := v_line_cost + (v_consume * v_line.avg_cost);
      IF v_level < 0 THEN v_stock_short := true; END IF;
    END LOOP;
  ELSE
    SELECT * INTO v_stock_item
    FROM public.stock_items
    WHERE product_id = v_item.product_id AND track_stock IS TRUE
    LIMIT 1;

    IF NOT FOUND THEN
      UPDATE public.order_items SET unit_cost = 0, stock_short = false WHERE id = p_item_id;
      RETURN;
    END IF;

    v_consume := v_item.quantity;
    IF v_item.weight_grams IS NOT NULL AND v_item.weight_grams > 0 THEN
      v_consume := round(v_consume * (v_item.weight_grams::numeric / 1000.0), 4);
    END IF;

    v_level := public.pos_apply_stock_delta(
      v_stock_item.id, v_wh, -v_consume, v_stock_item.avg_cost,
      'sale', 'order_item', p_item_id, NULL
    );
    v_line_cost := round(v_consume * v_stock_item.avg_cost, 4);
    IF v_level < 0 THEN v_stock_short := true; END IF;
  END IF;

  v_unit_cost := round(v_line_cost / NULLIF(v_item.quantity, 0), 4);

  UPDATE public.order_items
  SET unit_cost = COALESCE(v_unit_cost, 0), stock_short = v_stock_short
  WHERE id = p_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_reverse_line_stock(p_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_mov record;
  v_wh uuid;
BEGIN
  v_wh := public.pos_default_warehouse_id();
  IF v_wh IS NULL THEN RETURN; END IF;

  FOR v_mov IN
    SELECT * FROM public.stock_movements
    WHERE reference_type = 'order_item' AND reference_id = p_item_id
      AND movement_type IN ('sale', 'recipe_consume')
  LOOP
    PERFORM public.pos_apply_stock_delta(
      v_mov.stock_item_id, v_mov.warehouse_id, -v_mov.qty_delta, v_mov.unit_cost,
      'reverse', 'order_item', p_item_id, 'void reverse'
    );
  END LOOP;

  UPDATE public.order_items SET stock_short = false WHERE id = p_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_earn_points(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_settings jsonb;
  v_points integer;
  v_existing uuid;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND OR v_order.customer_id IS NULL THEN RETURN; END IF;

  v_settings := public.pos_loyalty_settings();
  IF COALESCE((v_settings->>'enabled')::boolean, true) IS NOT TRUE THEN RETURN; END IF;

  SELECT id INTO v_existing
  FROM public.loyalty_ledger
  WHERE order_id = p_order_id AND reason = 'earn';
  IF FOUND THEN RETURN; END IF;

  v_points := floor(v_order.total / 100.0) * COALESCE((v_settings->>'earn_per_100_egp')::integer, 1);
  IF v_points <= 0 THEN RETURN; END IF;

  INSERT INTO public.loyalty_accounts (customer_id, points_balance)
  VALUES (v_order.customer_id, 0)
  ON CONFLICT (customer_id) DO NOTHING;

  INSERT INTO public.loyalty_ledger (customer_id, order_id, points_delta, reason)
  VALUES (v_order.customer_id, p_order_id, v_points, 'earn');

  UPDATE public.loyalty_accounts
  SET points_balance = points_balance + v_points, updated_at = now()
  WHERE customer_id = v_order.customer_id;

  INSERT INTO public.customer_notifications (
    customer_id, notification_type, title_ar, title_en, body_ar, body_en
  ) VALUES (
    v_order.customer_id, 'points_earned',
    'نقاط جديدة', 'Points earned',
    format('كسبت %s نقطة من طلبك', v_points),
    format('You earned %s points from your order', v_points)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_reverse_points(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_row record;
BEGIN
  FOR v_row IN
    SELECT * FROM public.loyalty_ledger WHERE order_id = p_order_id AND reason = 'earn'
  LOOP
    UPDATE public.loyalty_accounts
    SET points_balance = greatest(0, points_balance - v_row.points_delta), updated_at = now()
    WHERE customer_id = v_row.customer_id;
    DELETE FROM public.loyalty_ledger WHERE id = v_row.id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_redeem_customer_offer(
  p_order_id uuid,
  p_customer_offer_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_offer public.customer_offers%ROWTYPE;
  v_discount numeric := 0;
BEGIN
  IF p_customer_offer_id IS NULL THEN RETURN 0; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  SELECT * INTO v_offer FROM public.customer_offers WHERE id = p_customer_offer_id FOR UPDATE;

  IF NOT FOUND OR v_offer.customer_id IS DISTINCT FROM v_order.customer_id THEN
    RAISE EXCEPTION 'invalid_offer';
  END IF;
  IF v_offer.redeemed_at IS NOT NULL THEN
    RAISE EXCEPTION 'offer_already_redeemed';
  END IF;
  IF v_offer.expires_at IS NOT NULL AND v_offer.expires_at < now() THEN
    RAISE EXCEPTION 'offer_expired';
  END IF;

  IF v_offer.discount_type = 'percentage' THEN
    v_discount := round(v_order.subtotal * (v_offer.discount_value / 100.0), 2);
  ELSE
    v_discount := round(least(v_offer.discount_value, v_order.subtotal), 2);
  END IF;

  PERFORM set_config('warda.order_rpc_bypass', '1', true);

  UPDATE public.orders
  SET discount_amount = round(COALESCE(discount_amount, 0) + v_discount, 2),
      total = round(greatest(total - v_discount, 0), 2),
      updated_at = now()
  WHERE id = p_order_id;

  UPDATE public.customer_offers
  SET redeemed_at = now(), order_id = p_order_id
  WHERE id = p_customer_offer_id;

  RETURN v_discount;
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_finalize_order(p_order_id uuid, p_customer_offer_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_item record;
BEGIN
  IF p_customer_offer_id IS NOT NULL THEN
    PERFORM public.pos_redeem_customer_offer(p_order_id, p_customer_offer_id);
  END IF;

  FOR v_item IN SELECT id FROM public.order_items WHERE order_id = p_order_id AND voided_at IS NULL
  LOOP
    PERFORM public.pos_apply_line_stock(v_item.id);
  END LOOP;

  PERFORM public.pos_earn_points(p_order_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_post_purchase(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supplier_id uuid;
  v_invoice_number text;
  v_invoice_date date;
  v_notes text;
  v_line jsonb;
  v_invoice_id uuid;
  v_total numeric := 0;
  v_wh uuid;
  v_stock_item_id uuid;
  v_qty numeric;
  v_unit_cost numeric;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  PERFORM public.assert_shift_open();

  v_supplier_id := (p_payload->>'supplier_id')::uuid;
  v_invoice_number := NULLIF(btrim(p_payload->>'invoice_number'), '');
  v_invoice_date := COALESCE((p_payload->>'invoice_date')::date, CURRENT_DATE);
  v_notes := NULLIF(btrim(p_payload->>'notes'), '');

  IF v_supplier_id IS NULL OR jsonb_typeof(p_payload->'lines') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'invalid_payload';
  END IF;

  v_wh := public.pos_default_warehouse_id();
  IF v_wh IS NULL THEN RAISE EXCEPTION 'no_warehouse'; END IF;

  INSERT INTO public.purchase_invoices (supplier_id, invoice_number, invoice_date, notes, created_by)
  VALUES (v_supplier_id, v_invoice_number, v_invoice_date, v_notes, auth.uid())
  RETURNING id INTO v_invoice_id;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_payload->'lines')
  LOOP
    v_stock_item_id := (v_line->>'stock_item_id')::uuid;
    v_qty := (v_line->>'qty')::numeric;
    v_unit_cost := (v_line->>'unit_cost')::numeric;
    IF v_stock_item_id IS NULL OR v_qty IS NULL OR v_qty <= 0 OR v_unit_cost IS NULL THEN
      RAISE EXCEPTION 'invalid_payload';
    END IF;

    INSERT INTO public.purchase_invoice_lines (invoice_id, stock_item_id, qty, unit_cost)
    VALUES (v_invoice_id, v_stock_item_id, v_qty, v_unit_cost);

    PERFORM public.pos_apply_stock_delta(
      v_stock_item_id, v_wh, v_qty, v_unit_cost, 'purchase', 'purchase_invoice', v_invoice_id, NULL
    );
    v_total := v_total + round(v_qty * v_unit_cost, 2);
  END LOOP;

  v_total := round(v_total, 2);
  UPDATE public.purchase_invoices SET total = v_total, posted_at = now() WHERE id = v_invoice_id;
  UPDATE public.suppliers SET balance = balance + v_total, updated_at = now() WHERE id = v_supplier_id;

  RETURN jsonb_build_object('id', v_invoice_id, 'total', v_total);
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_supplier_payment(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supplier_id uuid;
  v_invoice_id uuid;
  v_amount numeric;
  v_payment_date date;
  v_notes text;
  v_payment_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  PERFORM public.assert_shift_open();

  v_supplier_id := (p_payload->>'supplier_id')::uuid;
  v_invoice_id := NULLIF(p_payload->>'invoice_id', '')::uuid;
  v_amount := (p_payload->>'amount')::numeric;
  v_payment_date := COALESCE((p_payload->>'payment_date')::date, CURRENT_DATE);
  v_notes := NULLIF(btrim(p_payload->>'notes'), '');

  IF v_supplier_id IS NULL OR v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_payload';
  END IF;

  INSERT INTO public.supplier_payments (supplier_id, invoice_id, amount, payment_date, notes, created_by)
  VALUES (v_supplier_id, v_invoice_id, v_amount, v_payment_date, v_notes, auth.uid())
  RETURNING id INTO v_payment_id;

  UPDATE public.suppliers SET balance = balance - v_amount, updated_at = now() WHERE id = v_supplier_id;

  IF v_invoice_id IS NOT NULL THEN
    UPDATE public.purchase_invoices
    SET paid_amount = round(paid_amount + v_amount, 2)
    WHERE id = v_invoice_id;
  END IF;

  RETURN jsonb_build_object('id', v_payment_id, 'amount', v_amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_adjust_stock(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock_item_id uuid;
  v_qty_delta numeric;
  v_unit_cost numeric;
  v_notes text;
  v_wh uuid;
  v_new_qty numeric;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  PERFORM public.assert_shift_open();

  v_stock_item_id := (p_payload->>'stock_item_id')::uuid;
  v_qty_delta := (p_payload->>'qty_delta')::numeric;
  v_unit_cost := COALESCE((p_payload->>'unit_cost')::numeric, 0);
  v_notes := NULLIF(btrim(p_payload->>'notes'), '');

  IF v_stock_item_id IS NULL OR v_qty_delta IS NULL OR v_qty_delta = 0 THEN
    RAISE EXCEPTION 'invalid_payload';
  END IF;

  v_wh := public.pos_default_warehouse_id();
  IF v_wh IS NULL THEN RAISE EXCEPTION 'no_warehouse'; END IF;

  v_new_qty := public.pos_apply_stock_delta(
    v_stock_item_id, v_wh, v_qty_delta, v_unit_cost, 'adjust', 'manual', NULL, v_notes
  );

  RETURN jsonb_build_object('stock_item_id', v_stock_item_id, 'qty', v_new_qty);
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_sales_report(p_from timestamptz, p_to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orders jsonb;
  v_products jsonb;
  v_profit numeric;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.created_at DESC), '[]'::jsonb)
  INTO v_orders
  FROM (
    SELECT
      o.id,
      o.order_number,
      o.created_at,
      o.customer_name,
      o.status,
      o.total AS sell_total,
      COALESCE((
        SELECT sum(COALESCE(oi.unit_cost, 0) * oi.quantity)
        FROM public.order_items oi
        WHERE oi.order_id = o.id AND oi.voided_at IS NULL
      ), 0) AS cost_total,
      o.total - COALESCE((
        SELECT sum(COALESCE(oi.unit_cost, 0) * oi.quantity)
        FROM public.order_items oi
        WHERE oi.order_id = o.id AND oi.voided_at IS NULL
      ), 0) AS margin
    FROM public.orders o
    WHERE o.created_at >= p_from AND o.created_at <= p_to
      AND o.status <> 'cancelled'
  ) x;

  SELECT COALESCE(jsonb_agg(row_to_json(p)::jsonb ORDER BY p.sell_total DESC), '[]'::jsonb)
  INTO v_products
  FROM (
    SELECT
      oi.product_id,
      max(oi.name_en) AS name_en,
      max(oi.name_ar) AS name_ar,
      sum(oi.quantity) AS qty_sold,
      sum(oi.unit_price * oi.quantity) AS sell_total,
      sum(COALESCE(oi.unit_cost, 0) * oi.quantity) AS cost_total,
      sum(oi.unit_price * oi.quantity) - sum(COALESCE(oi.unit_cost, 0) * oi.quantity) AS margin
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.created_at >= p_from AND o.created_at <= p_to
      AND o.status <> 'cancelled'
      AND oi.voided_at IS NULL
      AND oi.product_id IS NOT NULL
    GROUP BY oi.product_id
  ) p;

  SELECT COALESCE(sum((elem->>'margin')::numeric), 0)
  INTO v_profit
  FROM jsonb_array_elements(v_orders) elem;

  RETURN jsonb_build_object(
    'profit', round(COALESCE(v_profit, 0), 2),
    'orders', v_orders,
    'products', v_products
  );
END;
$$;

-- Customer RPCs (narrow reads; cookie verified in route handlers via matching customer_id)
CREATE OR REPLACE FUNCTION public.customer_upsert_by_phone(
  p_phone_normalized text,
  p_first_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_name text;
BEGIN
  v_name := btrim(COALESCE(p_first_name, ''));
  IF v_name = '' OR char_length(v_name) > 200 THEN
    RAISE EXCEPTION 'name_required';
  END IF;
  IF p_phone_normalized IS NULL OR char_length(p_phone_normalized) < 8 THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;

  INSERT INTO public.customers_public (phone_normalized, first_name, display_name)
  VALUES (p_phone_normalized, v_name, v_name)
  ON CONFLICT (phone_normalized) DO UPDATE
  SET first_name = EXCLUDED.first_name,
      display_name = COALESCE(customers_public.display_name, EXCLUDED.first_name),
      updated_at = now()
  RETURNING id INTO v_id;

  INSERT INTO public.loyalty_accounts (customer_id) VALUES (v_id)
  ON CONFLICT (customer_id) DO NOTHING;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.customer_get_account(p_customer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_c public.customers_public%ROWTYPE;
  v_points integer;
BEGIN
  SELECT * INTO v_c FROM public.customers_public WHERE id = p_customer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;

  SELECT COALESCE(points_balance, 0) INTO v_points
  FROM public.loyalty_accounts WHERE customer_id = p_customer_id;

  RETURN jsonb_build_object(
    'id', v_c.id,
    'phone_normalized', v_c.phone_normalized,
    'first_name', v_c.first_name,
    'display_name', v_c.display_name,
    'points_balance', v_points
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.customer_get_notifications(p_customer_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(to_jsonb(n) ORDER BY n.created_at DESC), '[]'::jsonb)
  FROM public.customer_notifications n
  WHERE n.customer_id = p_customer_id;
$$;

CREATE OR REPLACE FUNCTION public.customer_get_offers(p_customer_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(to_jsonb(o) ORDER BY o.created_at DESC), '[]'::jsonb)
  FROM public.customer_offers o
  WHERE o.customer_id = p_customer_id
    AND o.redeemed_at IS NULL
    AND (o.expires_at IS NULL OR o.expires_at > now());
$$;

CREATE OR REPLACE FUNCTION public.customer_update_name(p_customer_id uuid, p_display_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.customers_public
  SET display_name = btrim(p_display_name), updated_at = now()
  WHERE id = p_customer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.customer_mark_notification_read(p_customer_id uuid, p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.customer_notifications
  SET read_at = now()
  WHERE id = p_notification_id AND customer_id = p_customer_id;
END;
$$;

-- Open / close shift RPCs
CREATE OR REPLACE FUNCTION public.pos_open_shift(p_notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.shifts WHERE status = 'open') THEN
    RAISE EXCEPTION 'shift_already_open';
  END IF;

  INSERT INTO public.shifts (status, opened_by, opening_notes)
  VALUES ('open', auth.uid(), NULLIF(btrim(p_notes), ''))
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'status', 'open');
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_close_shift(p_shift_id uuid, p_notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  UPDATE public.shifts
  SET status = 'closed', closed_at = now(), closed_by = auth.uid(),
      closing_notes = NULLIF(btrim(p_notes), '')
  WHERE id = p_shift_id AND status = 'open';

  IF NOT FOUND THEN RAISE EXCEPTION 'shift_not_found'; END IF;

  RETURN jsonb_build_object('id', p_shift_id, 'status', 'closed');
END;
$$;

CREATE OR REPLACE FUNCTION public.pos_get_open_shift()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(s)
  FROM public.shifts s
  WHERE s.status = 'open'
  ORDER BY s.opened_at DESC
  LIMIT 1;
$$;


-- Order RPC hooks (from 041/037/040 bodies + Ostol POS)

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
  v_customer_id uuid;
  v_customer_offer_id uuid;
  v_active_offer record;
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

  IF payload ? 'customer_id' AND NULLIF(btrim(COALESCE(payload->>'customer_id', '')), '') IS NOT NULL THEN
    BEGIN
      v_customer_id := (payload->>'customer_id')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      v_customer_id := NULL;
    END;
    IF v_customer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.customers_public WHERE id = v_customer_id) THEN
      v_customer_id := NULL;
    END IF;
  END IF;

  IF payload ? 'customer_offer_id' AND NULLIF(btrim(COALESCE(payload->>'customer_offer_id', '')), '') IS NOT NULL THEN
    BEGIN
      v_customer_offer_id := (payload->>'customer_offer_id')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      v_customer_offer_id := NULL;
    END;
  END IF;

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
    IF v_size IS NOT NULL AND v_size NOT IN ('small', 'medium', 'large', 'family') THEN
      RAISE EXCEPTION 'invalid_payload';
    END IF;

    v_active_offer := NULL;

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

    v_unit := public.resolve_product_size_unit_price(
      v_product.has_size_options,
      v_size,
      v_dining_mode,
      v_product.dining_price,
      v_product.takeaway_price,
      v_product.price_medium,
      v_product.price_family,
      v_product.size_small_enabled,
      v_product.size_medium_enabled,
      v_product.size_large_enabled,
      v_product.size_family_enabled
    );

    SELECT * INTO v_active_offer FROM public.pos_active_product_offer(v_product.id);
    IF FOUND THEN
      v_unit := v_active_offer.offer_price;
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
        'notes', v_item_notes,
        'product_offer_id', CASE WHEN v_active_offer.offer_id IS NOT NULL THEN v_active_offer.offer_id ELSE NULL END
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
    customer_name, customer_phone, customer_id, delivery_address, delivery_location_id, notes,
    subtotal, tax, service, discount_amount, coupon_id, coupon_code,
    delivery_fee, total, currency, whatsapp_sent, locale
  ) VALUES (
    v_order_number, 'new', v_dining_mode, v_fulfillment, v_table_number,
    v_customer_name, v_customer_phone, v_customer_id, v_delivery_address, v_delivery_location_id, v_notes,
    v_subtotal, v_tax, v_service, v_discount, v_coupon_id, v_coupon_code,
    v_delivery_fee, v_total, v_currency, v_whatsapp_sent, v_locale
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id, product_id, name_ar, name_en, name_fr, name_nl,
    quantity, unit_price, size_option, notes, product_offer_id
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
    x.product_offer_id
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
    product_offer_id uuid
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

  PERFORM public.pos_finalize_order(v_order_id, v_customer_offer_id);

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
  v_active_offer record;
  v_customer_id uuid;
  v_customer_offer_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  PERFORM public.assert_shift_open();

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

  IF payload ? 'customer_id' AND NULLIF(btrim(COALESCE(payload->>'customer_id', '')), '') IS NOT NULL THEN
    BEGIN
      v_customer_id := (payload->>'customer_id')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      v_customer_id := NULL;
    END;
  END IF;

  IF payload ? 'customer_offer_id' AND NULLIF(btrim(COALESCE(payload->>'customer_offer_id', '')), '') IS NOT NULL THEN
    BEGIN
      v_customer_offer_id := (payload->>'customer_offer_id')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      v_customer_offer_id := NULL;
    END;
  END IF;

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
      p.price_medium,
      p.price_family,
      p.size_small_enabled,
      p.size_medium_enabled,
      p.size_large_enabled,
      p.size_family_enabled,
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
    IF v_size IS NOT NULL AND v_size NOT IN ('small', 'medium', 'large', 'family') THEN
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

    v_active_offer := NULL;

    v_item_notes := NULLIF(btrim(COALESCE(v_rec.item->>'notes', '')), '');
    IF v_item_notes IS NOT NULL AND char_length(v_item_notes) > v_max_notes THEN
      RAISE EXCEPTION 'notes_too_long';
    END IF;

    IF v_weight IS NOT NULL AND v_rec.price_per_kg IS NOT NULL THEN
      v_unit := round(v_rec.price_per_kg * v_weight / 1000.0);
    ELSE
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
    END IF;

    SELECT * INTO v_active_offer FROM public.pos_active_product_offer(v_rec.product_id);
    IF FOUND THEN
      v_unit := v_active_offer.offer_price;
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
        'notes', v_item_notes,
        'product_offer_id', CASE WHEN v_active_offer.offer_id IS NOT NULL THEN v_active_offer.offer_id ELSE NULL END
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
    customer_name, customer_phone, customer_id, delivery_address, delivery_location_id, notes,
    subtotal, tax, service, discount_amount, coupon_id, coupon_code,
    delivery_fee, total, currency, whatsapp_sent, locale
  ) VALUES (
    v_order_number, 'new', v_dining_mode, v_fulfillment, v_table_number,
    v_customer_name, v_customer_phone, v_customer_id, v_delivery_address, v_delivery_location_id, v_notes,
    v_subtotal, v_tax, v_service, v_discount, v_coupon_id, v_coupon_code,
    v_delivery_fee, v_total, v_currency, true, v_locale
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id, product_id, name_ar, name_en, name_fr, name_nl,
    quantity, unit_price, size_option, weight_grams, notes, product_offer_id
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
    x.notes,
    x.product_offer_id
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
    notes text,
    product_offer_id uuid
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

  PERFORM public.pos_finalize_order(v_order_id, v_customer_offer_id);

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

  PERFORM public.assert_shift_open();

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
    updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'id', p_order_id,
    'payment_method', v_method,
    'amount_received', v_received,
    'change_due', v_change,
    'paid_at', now(),
    'status', v_order.status,
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

  PERFORM public.assert_shift_open();

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

  PERFORM public.pos_reverse_line_stock(p_item_id);

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
  v_item record;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  PERFORM public.assert_shift_open();

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

  FOR v_item IN SELECT id FROM public.order_items WHERE order_id = p_order_id AND voided_at IS NULL LOOP
    PERFORM public.pos_reverse_line_stock(v_item.id);
  END LOOP;
  PERFORM public.pos_reverse_points(p_order_id);

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

REVOKE ALL ON FUNCTION public.assert_shift_open() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.pos_apply_line_stock(uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.pos_reverse_line_stock(uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.pos_earn_points(uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.pos_reverse_points(uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.pos_redeem_customer_offer(uuid, uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.pos_finalize_order(uuid, uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.pos_post_purchase(jsonb) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.pos_supplier_payment(jsonb) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.pos_adjust_stock(jsonb) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.pos_sales_report(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.pos_open_shift(text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.pos_close_shift(uuid, text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.pos_get_open_shift() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.customer_upsert_by_phone(text, text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.customer_get_account(uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.customer_get_notifications(uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.customer_get_offers(uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.customer_update_name(uuid, text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.customer_mark_notification_read(uuid, uuid) FROM PUBLIC, anon, authenticated;



GRANT EXECUTE ON FUNCTION public.pos_post_purchase(jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pos_supplier_payment(jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pos_adjust_stock(jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pos_sales_report(timestamptz, timestamptz) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pos_open_shift(text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pos_close_shift(uuid, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pos_get_open_shift() TO authenticated;

GRANT EXECUTE ON FUNCTION public.customer_upsert_by_phone(text, text) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.customer_get_account(uuid) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.customer_get_notifications(uuid) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.customer_get_offers(uuid) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.customer_update_name(uuid, text) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.customer_mark_notification_read(uuid, uuid) TO anon, authenticated;



COMMENT ON FUNCTION public.assert_shift_open() IS 'Staff POS guard; UI gated by isAlaKeefakTenant.';

COMMENT ON FUNCTION public.pos_sales_report(timestamptz, timestamptz) IS 'Costed sales report for Ostol POS (isAlaKeefakTenant UI).';