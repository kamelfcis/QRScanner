-- Allow cart/checkout analytics events used by WhatsApp ordering.
CREATE OR REPLACE FUNCTION public.track_analytics_event(
  p_event_type TEXT,
  p_event_data JSONB DEFAULT '{}'::jsonb,
  p_user_agent TEXT DEFAULT NULL,
  p_device_type TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_allowed TEXT[] := ARRAY[
    'page_view', 'product_view', 'category_view', 'qr_scan',
    'dining_order', 'takeaway_order', 'search', 'offer_click', 'favorite_toggle',
    'add_to_cart', 'cart_open', 'checkout_start', 'order_whatsapp'
  ];
BEGIN
  IF p_event_type IS NULL OR NOT (p_event_type = ANY (v_allowed)) THEN
    RAISE EXCEPTION 'Invalid event type';
  END IF;

  IF p_event_data IS NOT NULL AND octet_length(p_event_data::text) > 4096 THEN
    RAISE EXCEPTION 'Event data too large';
  END IF;

  IF p_user_agent IS NOT NULL AND length(p_user_agent) > 512 THEN
    p_user_agent := left(p_user_agent, 512);
  END IF;

  INSERT INTO public.analytics (event_type, event_data, user_agent, device_type)
  VALUES (
    p_event_type,
    COALESCE(p_event_data, '{}'::jsonb),
    p_user_agent,
    CASE
      WHEN p_device_type IN ('mobile', 'tablet', 'desktop', 'unknown') THEN p_device_type
      ELSE 'unknown'
    END
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_analytics_event(TEXT, JSONB, TEXT, TEXT) TO anon, authenticated;
