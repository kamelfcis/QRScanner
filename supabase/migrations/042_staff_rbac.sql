-- Staff RBAC: kitchen/custom roles, permission matrix, staff_can()
-- Version: 042
-- Date: 2026-10-06
-- Apply only on Ala Keefak (pytmkruoyyhxfktnkpuu).

ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS full_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_role_check;
ALTER TABLE public.staff_profiles
  ADD CONSTRAINT staff_profiles_role_check
  CHECK (role IN ('admin', 'cashier', 'kitchen', 'custom'));

ALTER TABLE public.staff_profiles ALTER COLUMN role SET DEFAULT 'cashier';

CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.staff_profiles
     WHERE user_id = (SELECT auth.uid())
       AND role = 'admin'
       AND COALESCE(is_active, true)
  );
$$;

CREATE OR REPLACE FUNCTION public.staff_can(p_resource text, p_action text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_active boolean;
  v_perms jsonb;
  v_actions jsonb;
  v_write boolean;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN false;
  END IF;

  SELECT sp.role, COALESCE(sp.is_active, true), COALESCE(sp.permissions, '{}'::jsonb)
    INTO v_role, v_active, v_perms
    FROM public.staff_profiles sp
   WHERE sp.user_id = (SELECT auth.uid());

  IF v_role IS NULL OR v_active IS NOT TRUE THEN
    RETURN false;
  END IF;

  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  IF p_resource = 'users' THEN
    RETURN false;
  END IF;

  IF v_role = 'cashier' THEN
    v_perms := '{
      "dashboard": ["view"],
      "orders": ["view", "create", "update"],
      "kitchen": ["view", "update"],
      "shift": ["view", "create", "update"]
    }'::jsonb;
  ELSIF v_role = 'kitchen' THEN
    v_perms := '{"kitchen": ["view", "update"]}'::jsonb;
  END IF;

  v_actions := v_perms -> p_resource;
  IF v_actions IS NULL OR jsonb_typeof(v_actions) <> 'array' THEN
    RETURN false;
  END IF;

  IF v_actions ? p_action THEN
    RETURN true;
  END IF;

  v_write := (v_actions ? 'create') OR (v_actions ? 'update') OR (v_actions ? 'delete');
  IF p_action = 'view' AND v_write THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.is_staff_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.staff_can(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_can(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_staff_profile_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.staff_profiles (user_id, role, is_active)
  VALUES (NEW.id, 'cashier', true)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Catalog writes: keep public SELECT; require staff_can for authenticated writes.
DROP POLICY IF EXISTS "Admin all categories" ON public.categories;
DROP POLICY IF EXISTS "Staff select all categories" ON public.categories;
DROP POLICY IF EXISTS "Staff insert categories" ON public.categories;
DROP POLICY IF EXISTS "Staff update categories" ON public.categories;
DROP POLICY IF EXISTS "Staff delete categories" ON public.categories;
CREATE POLICY "Staff select all categories"
  ON public.categories FOR SELECT TO authenticated
  USING (public.staff_can('menu', 'view'));
CREATE POLICY "Staff insert categories"
  ON public.categories FOR INSERT TO authenticated
  WITH CHECK (public.staff_can('menu', 'create'));
CREATE POLICY "Staff update categories"
  ON public.categories FOR UPDATE TO authenticated
  USING (public.staff_can('menu', 'update'))
  WITH CHECK (public.staff_can('menu', 'update'));
CREATE POLICY "Staff delete categories"
  ON public.categories FOR DELETE TO authenticated
  USING (public.staff_can('menu', 'delete'));

DROP POLICY IF EXISTS "Admin all subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Staff select all subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Staff insert subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Staff update subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Staff delete subcategories" ON public.subcategories;
CREATE POLICY "Staff select all subcategories"
  ON public.subcategories FOR SELECT TO authenticated
  USING (public.staff_can('menu', 'view'));
CREATE POLICY "Staff insert subcategories"
  ON public.subcategories FOR INSERT TO authenticated
  WITH CHECK (public.staff_can('menu', 'create'));
CREATE POLICY "Staff update subcategories"
  ON public.subcategories FOR UPDATE TO authenticated
  USING (public.staff_can('menu', 'update'))
  WITH CHECK (public.staff_can('menu', 'update'));
CREATE POLICY "Staff delete subcategories"
  ON public.subcategories FOR DELETE TO authenticated
  USING (public.staff_can('menu', 'delete'));

DROP POLICY IF EXISTS "Admin all products" ON public.products;
DROP POLICY IF EXISTS "Staff select all products" ON public.products;
DROP POLICY IF EXISTS "Staff insert products" ON public.products;
DROP POLICY IF EXISTS "Staff update products" ON public.products;
DROP POLICY IF EXISTS "Staff delete products" ON public.products;
CREATE POLICY "Staff select all products"
  ON public.products FOR SELECT TO authenticated
  USING (public.staff_can('menu', 'view') OR public.staff_can('kitchen', 'update'));
CREATE POLICY "Staff insert products"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.staff_can('menu', 'create'));
CREATE POLICY "Staff update products"
  ON public.products FOR UPDATE TO authenticated
  USING (public.staff_can('menu', 'update') OR public.staff_can('kitchen', 'update'))
  WITH CHECK (public.staff_can('menu', 'update') OR public.staff_can('kitchen', 'update'));
CREATE POLICY "Staff delete products"
  ON public.products FOR DELETE TO authenticated
  USING (public.staff_can('menu', 'delete'));

DROP POLICY IF EXISTS "Admin all product_gallery" ON public.product_gallery;
DROP POLICY IF EXISTS "Staff select product_gallery" ON public.product_gallery;
DROP POLICY IF EXISTS "Staff insert product_gallery" ON public.product_gallery;
DROP POLICY IF EXISTS "Staff update product_gallery" ON public.product_gallery;
DROP POLICY IF EXISTS "Staff delete product_gallery" ON public.product_gallery;
CREATE POLICY "Staff select product_gallery"
  ON public.product_gallery FOR SELECT TO authenticated
  USING (public.staff_can('menu', 'view'));
CREATE POLICY "Staff insert product_gallery"
  ON public.product_gallery FOR INSERT TO authenticated
  WITH CHECK (public.staff_can('menu', 'create'));
CREATE POLICY "Staff update product_gallery"
  ON public.product_gallery FOR UPDATE TO authenticated
  USING (public.staff_can('menu', 'update'))
  WITH CHECK (public.staff_can('menu', 'update'));
CREATE POLICY "Staff delete product_gallery"
  ON public.product_gallery FOR DELETE TO authenticated
  USING (public.staff_can('menu', 'delete'));

DROP POLICY IF EXISTS "Admin all offers" ON public.offers;
DROP POLICY IF EXISTS "Staff select all offers" ON public.offers;
DROP POLICY IF EXISTS "Staff insert offers" ON public.offers;
DROP POLICY IF EXISTS "Staff update offers" ON public.offers;
DROP POLICY IF EXISTS "Staff delete offers" ON public.offers;
CREATE POLICY "Staff select all offers"
  ON public.offers FOR SELECT TO authenticated
  USING (public.staff_can('menu', 'view'));
CREATE POLICY "Staff insert offers"
  ON public.offers FOR INSERT TO authenticated
  WITH CHECK (public.staff_can('menu', 'create'));
CREATE POLICY "Staff update offers"
  ON public.offers FOR UPDATE TO authenticated
  USING (public.staff_can('menu', 'update'))
  WITH CHECK (public.staff_can('menu', 'update'));
CREATE POLICY "Staff delete offers"
  ON public.offers FOR DELETE TO authenticated
  USING (public.staff_can('menu', 'delete'));

DROP POLICY IF EXISTS "Admin insert settings" ON public.settings;
DROP POLICY IF EXISTS "Admin update settings" ON public.settings;
DROP POLICY IF EXISTS "Admin delete settings" ON public.settings;
CREATE POLICY "Admin insert settings"
  ON public.settings FOR INSERT TO authenticated
  WITH CHECK (public.staff_can('settings', 'create') AND key <> 'features');
CREATE POLICY "Admin update settings"
  ON public.settings FOR UPDATE TO authenticated
  USING (public.staff_can('settings', 'update') AND key <> 'features')
  WITH CHECK (public.staff_can('settings', 'update') AND key <> 'features');
CREATE POLICY "Admin delete settings"
  ON public.settings FOR DELETE TO authenticated
  USING (public.staff_can('settings', 'delete') AND key <> 'features');

DROP POLICY IF EXISTS "Staff select orders" ON public.orders;
CREATE POLICY "Staff select orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.staff_can('orders', 'view') OR public.staff_can('kitchen', 'view'));

DROP POLICY IF EXISTS "Staff update orders" ON public.orders;
CREATE POLICY "Staff update orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (public.staff_can('orders', 'update') OR public.staff_can('kitchen', 'update'))
  WITH CHECK (public.staff_can('orders', 'update') OR public.staff_can('kitchen', 'update'));

DROP POLICY IF EXISTS "Staff delete orders" ON public.orders;
CREATE POLICY "Staff delete orders"
  ON public.orders FOR DELETE TO authenticated
  USING (public.staff_can('orders', 'delete'));

DROP POLICY IF EXISTS "Staff select order_items" ON public.order_items;
CREATE POLICY "Staff select order_items"
  ON public.order_items FOR SELECT TO authenticated
  USING (public.staff_can('orders', 'view') OR public.staff_can('kitchen', 'view'));

DROP POLICY IF EXISTS "Staff select coupons" ON public.coupons;
DROP POLICY IF EXISTS "Staff insert coupons" ON public.coupons;
DROP POLICY IF EXISTS "Staff update coupons" ON public.coupons;
DROP POLICY IF EXISTS "Staff delete coupons" ON public.coupons;
CREATE POLICY "Staff select coupons"
  ON public.coupons FOR SELECT TO authenticated
  USING (public.staff_can('coupons', 'view'));
CREATE POLICY "Staff insert coupons"
  ON public.coupons FOR INSERT TO authenticated
  WITH CHECK (public.staff_can('coupons', 'create'));
CREATE POLICY "Staff update coupons"
  ON public.coupons FOR UPDATE TO authenticated
  USING (public.staff_can('coupons', 'update'))
  WITH CHECK (public.staff_can('coupons', 'update'));
CREATE POLICY "Staff delete coupons"
  ON public.coupons FOR DELETE TO authenticated
  USING (public.staff_can('coupons', 'delete'));

DROP POLICY IF EXISTS "Staff select expenses" ON public.expenses;
DROP POLICY IF EXISTS "Staff insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Staff update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Staff delete expenses" ON public.expenses;
CREATE POLICY "Staff select expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING (public.staff_can('expenses', 'view'));
CREATE POLICY "Staff insert expenses"
  ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (public.staff_can('expenses', 'create'));
CREATE POLICY "Staff update expenses"
  ON public.expenses FOR UPDATE TO authenticated
  USING (public.staff_can('expenses', 'update'))
  WITH CHECK (public.staff_can('expenses', 'update'));
CREATE POLICY "Staff delete expenses"
  ON public.expenses FOR DELETE TO authenticated
  USING (public.staff_can('expenses', 'delete'));

DROP POLICY IF EXISTS "Staff select delivery_locations" ON public.delivery_locations;
DROP POLICY IF EXISTS "Staff insert delivery_locations" ON public.delivery_locations;
DROP POLICY IF EXISTS "Staff update delivery_locations" ON public.delivery_locations;
DROP POLICY IF EXISTS "Staff delete delivery_locations" ON public.delivery_locations;
CREATE POLICY "Staff select delivery_locations"
  ON public.delivery_locations FOR SELECT TO authenticated
  USING (public.staff_can('deliveryLocations', 'view'));
CREATE POLICY "Staff insert delivery_locations"
  ON public.delivery_locations FOR INSERT TO authenticated
  WITH CHECK (public.staff_can('deliveryLocations', 'create'));
CREATE POLICY "Staff update delivery_locations"
  ON public.delivery_locations FOR UPDATE TO authenticated
  USING (public.staff_can('deliveryLocations', 'update'))
  WITH CHECK (public.staff_can('deliveryLocations', 'update'));
CREATE POLICY "Staff delete delivery_locations"
  ON public.delivery_locations FOR DELETE TO authenticated
  USING (public.staff_can('deliveryLocations', 'delete'));

DROP POLICY IF EXISTS "Staff select shift_closes" ON public.shift_closes;
DROP POLICY IF EXISTS "Staff insert shift_closes" ON public.shift_closes;
CREATE POLICY "Staff select shift_closes"
  ON public.shift_closes FOR SELECT TO authenticated
  USING (public.staff_can('shift', 'view'));
CREATE POLICY "Staff insert shift_closes"
  ON public.shift_closes FOR INSERT TO authenticated
  WITH CHECK (public.staff_can('shift', 'create'));

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

  IF NOT public.staff_can('orders', 'delete') THEN
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
