-- ============================================================
-- New restaurant settings template
-- Example brand: أكلة جمبري أنا / Akla Gambari Ana
-- ============================================================
-- WHEN TO RUN
--   After schema migrations (001-013), once settings rows exist
--   from 003_seed_data.sql (or equivalent inserts).
--
-- PURPOSE
--   Overwrite Warda Shamya defaults with placeholders for a new
--   Egypt / seafood restaurant. Edit YOUR_* values before go-live.
--
-- SAFE TO RE-RUN
--   Uses UPDATE ... WHERE key = ... (idempotent for these three keys).
-- ============================================================

-- Restaurant identity + Egypt contact + EGP
UPDATE public.settings
SET
  value = jsonb_build_object(
    'name_ar', 'أكلة جمبري أنا',
    'name_en', 'Akla Gambari Ana',
    'phone', 'YOUR_PHONE_EG',              -- e.g. 2010XXXXXXXX
    'whatsapp', 'YOUR_WHATSAPP_EG',        -- e.g. 2010XXXXXXXX (no +)
    'instagram', 'YOUR_INSTAGRAM',
    'facebook', 'YOUR_FACEBOOK',
    'tiktok', 'YOUR_TIKTOK',
    'address_ar', 'YOUR_ADDRESS_AR',       -- e.g. القاهرة، مصر
    'address_en', 'YOUR_ADDRESS_EN',       -- e.g. Cairo, Egypt
    'currency', 'EGP',
    'tax_rate', 0,
    'service_charge_rate', 0,
    'email', 'YOUR_EMAIL',
    'google_maps_url', null,
    'hero_image_url', null
  ),
  updated_at = now()
WHERE key = 'restaurant';

-- Seafood-friendly theme (ocean teal + coral accents -- tweak freely)
UPDATE public.settings
SET
  value = jsonb_build_object(
    'primary_color', '#0B6E4F',
    'secondary_color', '#0A3D62',
    'accent_color', '#E85D04',
    'background_color', '#F7FBF9'
  ),
  updated_at = now()
WHERE key = 'theme';

-- Opening hours placeholders (edit to match the restaurant)
UPDATE public.settings
SET
  value = jsonb_build_object(
    'saturday', jsonb_build_object('open', '12:00', 'close', '24:00'),
    'sunday', jsonb_build_object('open', '12:00', 'close', '24:00'),
    'monday', jsonb_build_object('open', '12:00', 'close', '24:00'),
    'tuesday', jsonb_build_object('open', '12:00', 'close', '24:00'),
    'wednesday', jsonb_build_object('open', '12:00', 'close', '24:00'),
    'thursday', jsonb_build_object('open', '12:00', 'close', '24:00'),
    'friday', jsonb_build_object('open', '12:00', 'close', '24:00')
  ),
  updated_at = now()
WHERE key = 'hours';

-- Optional: if 003 was never applied, insert instead of update
INSERT INTO public.settings (key, value)
SELECT v.key, v.value
FROM (
  VALUES
    ('restaurant', '{
      "name_ar": "أكلة جمبري أنا",
      "name_en": "Akla Gambari Ana",
      "phone": "YOUR_PHONE_EG",
      "whatsapp": "YOUR_WHATSAPP_EG",
      "instagram": "YOUR_INSTAGRAM",
      "facebook": "YOUR_FACEBOOK",
      "tiktok": "YOUR_TIKTOK",
      "address_ar": "YOUR_ADDRESS_AR",
      "address_en": "YOUR_ADDRESS_EN",
      "currency": "EGP",
      "tax_rate": 0,
      "service_charge_rate": 0,
      "email": "YOUR_EMAIL",
      "google_maps_url": null,
      "hero_image_url": null
    }'::jsonb),
    ('theme', '{
      "primary_color": "#0B6E4F",
      "secondary_color": "#0A3D62",
      "accent_color": "#E85D04",
      "background_color": "#F7FBF9"
    }'::jsonb),
    ('hours', '{
      "saturday": {"open": "12:00", "close": "24:00"},
      "sunday": {"open": "12:00", "close": "24:00"},
      "monday": {"open": "12:00", "close": "24:00"},
      "tuesday": {"open": "12:00", "close": "24:00"},
      "wednesday": {"open": "12:00", "close": "24:00"},
      "thursday": {"open": "12:00", "close": "24:00"},
      "friday": {"open": "12:00", "close": "24:00"}
    }'::jsonb)
) AS v(key, value)
WHERE NOT EXISTS (
  SELECT 1 FROM public.settings s WHERE s.key = v.key
);

-- Optional cleanup after overwriting Warda seed from 003:
-- DELETE FROM public.products;
-- DELETE FROM public.categories;
