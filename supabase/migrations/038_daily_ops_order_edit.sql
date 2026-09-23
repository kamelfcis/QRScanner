-- Daily ops phase 2: edit open orders, recalculate totals after void/edit
-- Version: 038
-- Date: 2026-09-23
-- Staff RPCs: update qty, append items, recalculate totals

CREATE OR REPLACE FUNCTION public.recalculate_order_totals(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_subtotal numeric := 0;
  v_discount numeric;
  v_taxable numeric;
  v_tax numeric := 0;
  v_service numeric := 0;
  v_total numeric;
  v_restaurant jsonb;
  v_tax_rate numeric;
  v_service_rate numeric;
  v_apply_tax boolean;
  v_apply_service boolean;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  SELECT COALESCE(sum(oi.quantity * oi.unit_price), 0)
  INTO v_subtotal
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id
    AND oi.voided_at IS NULL;

  v_subtotal := round(v_subtotal, 2);
  v_discount := round(least(COALESCE(v_order.discount_amount, 0), v_subtotal), 2);

  SELECT value INTO v_restaurant FROM public.settings WHERE key = 'restaurant';
  v_tax_rate := COALESCE((v_restaurant->>'tax_rate')::numeric, 15);
  v_service_rate := COALESCE((v_restaurant->>'service_charge_rate')::numeric, 10);
  v_apply_tax := COALESCE((v_restaurant->>'apply_tax')::boolean, true);
  v_apply_service := COALESCE((v_restaurant->>'apply_service_charge')::boolean, true);

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
    tax = v_tax,
    service = v_service,
    total = v_total,
    updated_at = now()
  WHERE id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_order_editable(p_order_id uuid)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_order.paid_at IS NOT NULL THEN
    RAISE EXCEPTION 'already_paid';
  END IF;

  IF v_order.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'order_closed';
  END IF;

  PERFORM public.assert_order_not_in_closed_shift(v_order.created_at);

  RETURN v_order;
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
  v_order_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

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

  v_order_id := v_item.order_id;
  PERFORM public.assert_order_editable(v_order_id);

  UPDATE public.order_items
  SET voided_at = now(), void_reason = v_reason
  WHERE id = p_item_id;

  PERFORM public.recalculate_order_totals(v_order_id);

  RETURN jsonb_build_object('id', p_item_id, 'voided_at', now(), 'void_reason', v_reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_order_item_quantity(
  p_item_id uuid,
  p_quantity integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.order_items%ROWTYPE;
  v_order_id uuid;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 99 THEN
    RAISE EXCEPTION 'invalid_quantity';
  END IF;

  SELECT oi.* INTO v_item
  FROM public.order_items oi
  WHERE oi.id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'item_not_found';
  END IF;

  IF v_item.voided_at IS NOT NULL THEN
    RAISE EXCEPTION 'already_voided';
  END IF;

  v_order_id := v_item.order_id;
  PERFORM public.assert_order_editable(v_order_id);

  UPDATE public.order_items
  SET quantity = p_quantity
  WHERE id = p_item_id;

  PERFORM public.recalculate_order_totals(v_order_id);

  RETURN jsonb_build_object('id', p_item_id, 'quantity', p_quantity);
END;
$$;

CREATE OR REPLACE FUNCTION public.append_items_to_order(
  p_order_id uuid,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_max_notes integer;
  v_qty integer;
  v_size text;
  v_weight integer;
  v_unit numeric;
  v_item_notes text;
  v_rec record;
  v_added integer := 0;
  v_restaurant jsonb;
BEGIN
  v_order := public.assert_order_editable(p_order_id);

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'empty_cart';
  END IF;

  IF jsonb_array_length(p_items) IS NULL OR jsonb_array_length(p_items) < 1 THEN
    RAISE EXCEPTION 'empty_cart';
  END IF;

  IF (
    SELECT count(*)
    FROM public.order_items
    WHERE order_id = p_order_id
  ) + jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'too_many_items';
  END IF;

  SELECT value INTO v_restaurant FROM public.settings WHERE key = 'restaurant';
  v_max_notes := COALESCE((v_restaurant->>'max_order_notes_length')::integer, 200);

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
    FROM jsonb_array_elements(p_items) WITH ORDINALITY AS e(value, ordinality)
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
    ELSIF v_order.dining_mode = 'takeaway' THEN
      v_unit := v_rec.takeaway_price;
    ELSE
      v_unit := v_rec.dining_price;
    END IF;

    INSERT INTO public.order_items (
      order_id, product_id, name_ar, name_en, name_fr, name_nl,
      quantity, unit_price, size_option, weight_grams, notes
    ) VALUES (
      p_order_id,
      v_rec.product_id,
      v_rec.name_ar,
      v_rec.name_en,
      v_rec.name_fr,
      v_rec.name_nl,
      v_qty,
      v_unit,
      v_size,
      v_weight,
      v_item_notes
    );

    v_added := v_added + 1;
  END LOOP;

  PERFORM public.recalculate_order_totals(p_order_id);

  RETURN jsonb_build_object('order_id', p_order_id, 'added', v_added);
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_order_totals(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assert_order_editable(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_order_item_quantity(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.append_items_to_order(uuid, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.update_order_item_quantity(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.append_items_to_order(uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION public.recalculate_order_totals(uuid) IS 'Recompute subtotal/tax/service/total from non-voided lines (staff RPC internal).';
COMMENT ON FUNCTION public.update_order_item_quantity(uuid, integer) IS 'Staff: change qty on an open unpaid order; recalculates totals.';
COMMENT ON FUNCTION public.append_items_to_order(uuid, jsonb) IS 'Staff: add lines to an open unpaid order; recalculates totals.';
