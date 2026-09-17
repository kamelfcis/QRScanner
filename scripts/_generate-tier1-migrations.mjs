#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const zoneMinPatch = `  v_min_order := COALESCE((v_restaurant->>'minimum_order')::numeric, 0);
  IF v_dining_mode = 'takeaway' AND v_fulfillment = 'delivery' AND v_delivery_location_id IS NOT NULL THEN
    IF COALESCE(v_location.minimum_order, 0) > 0 THEN
      v_min_order := v_location.minimum_order;
    END IF;
  END IF;
  v_currency`;

function patchMinOrder(fn) {
  return fn.replace(
    "  v_min_order := COALESCE((v_restaurant->>'minimum_order')::numeric, 0);\n  v_currency",
    zoneMinPatch
  );
}

function patchOrdersClosed(fn) {
  return fn.replace(
    "  SELECT value INTO v_restaurant FROM public.settings WHERE key = 'restaurant';\n\n  v_dining_mode",
    `  SELECT value INTO v_restaurant FROM public.settings WHERE key = 'restaurant';

  IF COALESCE((v_restaurant->>'accepting_orders')::boolean, true) IS NOT TRUE THEN
    RAISE EXCEPTION 'orders_closed';
  END IF;

  v_dining_mode`
  );
}

const customerSrc = readFileSync(join(ROOT, 'supabase/migrations/025_delivery_locations.sql'), 'utf8');
const customerMatch = customerSrc.match(
  /CREATE OR REPLACE FUNCTION public\.place_customer_order\([\s\S]*?\$\$;/
);
if (!customerMatch) throw new Error('place_customer_order not found');
const customerFn = patchMinOrder(customerMatch[0]);

const staffSrc = readFileSync(join(ROOT, 'supabase/migrations/026_place_staff_order.sql'), 'utf8');
const staffMatch = staffSrc.match(/CREATE OR REPLACE FUNCTION public\.place_staff_order\([\s\S]*?\$\$;/);
if (!staffMatch) throw new Error('place_staff_order not found');
const staffFn = patchMinOrder(staffMatch[0]);

const customerFn029 = patchOrdersClosed(customerFn);

const m028 = `-- Delivery zone minimum order + top sellers RPC
-- Version: 028
-- Date: 2026-09-17

ALTER TABLE public.delivery_locations
  ADD COLUMN IF NOT EXISTS minimum_order NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (minimum_order >= 0);

COMMENT ON COLUMN public.delivery_locations.minimum_order IS 'Per-zone minimum subtotal; when > 0 overrides restaurant minimum for delivery orders.';

CREATE OR REPLACE FUNCTION public.get_top_selling_products(p_days integer DEFAULT 30, p_limit integer DEFAULT 5)
RETURNS TABLE (
  product_id uuid,
  total_quantity bigint,
  name_en text,
  name_ar text,
  name_fr text,
  name_nl text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    oi.product_id,
    SUM(oi.quantity)::bigint AS total_quantity,
    p.name_en,
    p.name_ar,
    p.name_fr,
    p.name_nl
  FROM public.order_items oi
  INNER JOIN public.orders o ON o.id = oi.order_id
  INNER JOIN public.products p ON p.id = oi.product_id
  WHERE o.status <> 'cancelled'
    AND o.created_at >= now() - make_interval(days => GREATEST(COALESCE(p_days, 30), 1))
  GROUP BY oi.product_id, p.name_en, p.name_ar, p.name_fr, p.name_nl
  ORDER BY total_quantity DESC, p.name_en ASC
  LIMIT GREATEST(COALESCE(p_limit, 5), 1);
$$;

REVOKE ALL ON FUNCTION public.get_top_selling_products(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_top_selling_products(integer, integer) TO anon, authenticated;

${customerFn}

REVOKE ALL ON FUNCTION public.place_customer_order(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_customer_order(jsonb) TO anon, authenticated;

${staffFn}

REVOKE ALL ON FUNCTION public.place_staff_order(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_staff_order(jsonb) TO authenticated;
`;

const m029 = `-- Pause customer ordering via restaurant settings
-- Version: 029
-- Date: 2026-09-17

UPDATE public.settings
SET value = jsonb_set(COALESCE(value, '{}'::jsonb), '{accepting_orders}', 'true'::jsonb, true),
    updated_at = now()
WHERE key = 'restaurant'
  AND NOT (COALESCE(value, '{}'::jsonb) ? 'accepting_orders');

${customerFn029}

REVOKE ALL ON FUNCTION public.place_customer_order(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_customer_order(jsonb) TO anon, authenticated;
`;

writeFileSync(join(ROOT, 'supabase/migrations/028_delivery_location_min_order.sql'), m028);
writeFileSync(join(ROOT, 'supabase/migrations/029_accepting_orders.sql'), m029);
console.log('Wrote 028 and 029 migrations');
