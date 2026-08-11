UPDATE public.settings
SET
  value = jsonb_build_object(
    'name_ar', E'\u0633\u0648\u0642 \u0627\u0644\u062c\u0645\u0644\u0629 \u0634\u0631\u0643\u0629 \u0627\u0644\u062d\u0631\u0645\u064a\u0646',
    'name_en', 'Harameen Wholesale Market',
    'phone', 'YOUR_PHONE_EG',
    'whatsapp', 'YOUR_WHATSAPP_EG',
    'instagram', 'YOUR_INSTAGRAM',
    'facebook', 'YOUR_FACEBOOK',
    'tiktok', 'YOUR_TIKTOK',
    'address_ar', 'YOUR_ADDRESS_AR',
    'address_en', 'YOUR_ADDRESS_EN',
    'currency', 'EGP',
    'tax_rate', 0,
    'service_charge_rate', 0,
    'email', 'YOUR_EMAIL',
    'google_maps_url', null,
    'hero_image_url', null,
    'qr_target_path', '/'
  ),
  updated_at = now()
WHERE key = 'restaurant';

UPDATE public.settings
SET
  value = jsonb_build_object(
    'primary_color', '#1B7A3D',
    'secondary_color', '#145A2E',
    'accent_color', '#D4AF37',
    'background_color', '#F7FBF7'
  ),
  updated_at = now()
WHERE key = 'theme';

UPDATE public.settings
SET
  value = jsonb_build_object(
    'saturday', jsonb_build_object('open', '08:00', 'close', '22:00'),
    'sunday', jsonb_build_object('open', '08:00', 'close', '22:00'),
    'monday', jsonb_build_object('open', '08:00', 'close', '22:00'),
    'tuesday', jsonb_build_object('open', '08:00', 'close', '22:00'),
    'wednesday', jsonb_build_object('open', '08:00', 'close', '22:00'),
    'thursday', jsonb_build_object('open', '08:00', 'close', '22:00'),
    'friday', jsonb_build_object('open', '08:00', 'close', '22:00')
  ),
  updated_at = now()
WHERE key = 'hours';