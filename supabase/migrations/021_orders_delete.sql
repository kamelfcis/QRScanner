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
