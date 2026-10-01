-- Ecommerce stores use prep_time_days in settings.value->restaurant JSON (set via dashboard).
-- Restaurant mode continues using prep_time_minutes. No default row mutation — field is optional.

COMMENT ON TABLE public.settings IS 'Key/value JSONB settings. Ecommerce tenants may set restaurant.prep_time_days (integer days) alongside prep_time_minutes.';
