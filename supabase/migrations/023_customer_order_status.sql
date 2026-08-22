-- Guest kitchen status: narrow dual-key lookup. Does not open orders to public SELECT.
-- Version: 023
-- Date: 2026-08-22

CREATE OR REPLACE FUNCTION public.get_customer_order_status(
  p_order_number text,
  p_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_features jsonb;
  v_want_number text;
  v_entered text;
  v_stored text;
  v_tail integer;
  v_order_number text;
  v_status text;
  v_updated_at timestamptz;
  v_dining_mode text;
  v_match boolean := false;
BEGIN
  SELECT value INTO v_features FROM public.settings WHERE key = 'features';
  IF COALESCE((v_features->>'dashboard_orders')::boolean, false) IS NOT TRUE THEN
    RETURN NULL;
  END IF;

  v_want_number := upper(regexp_replace(btrim(COALESCE(p_order_number, '')), '\s+', '', 'g'));
  v_entered := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');

  IF v_want_number = '' OR char_length(v_entered) < 8 THEN
    RETURN NULL;
  END IF;

  SELECT
    o.order_number,
    o.status,
    o.updated_at,
    o.dining_mode,
    regexp_replace(COALESCE(o.customer_phone, ''), '[^0-9]', '', 'g')
  INTO
    v_order_number,
    v_status,
    v_updated_at,
    v_dining_mode,
    v_stored
  FROM public.orders o
  WHERE upper(regexp_replace(o.order_number, '\s+', '', 'g')) = v_want_number
  LIMIT 1;

  IF v_order_number IS NULL OR v_stored = '' THEN
    RETURN NULL;
  END IF;

  IF v_stored = v_entered THEN
    v_match := true;
  ELSIF char_length(v_stored) >= 8 AND char_length(v_entered) >= 8 THEN
    v_tail := least(9, char_length(v_stored), char_length(v_entered));
    v_match := right(v_stored, v_tail) = right(v_entered, v_tail);
  ELSE
    v_match := v_stored LIKE ('%' || v_entered) OR v_entered LIKE ('%' || v_stored);
  END IF;

  IF NOT v_match THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'order_number', v_order_number,
    'status', v_status,
    'updated_at', v_updated_at,
    'dining_mode', v_dining_mode
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_customer_order_status(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_customer_order_status(text, text) TO anon, authenticated;

COMMENT ON FUNCTION public.get_customer_order_status(text, text) IS
  'Returns order_number, status, updated_at, dining_mode only when both ticket number and customer phone match. No public SELECT on orders.';
