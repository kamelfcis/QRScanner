-- Ensure theme and hours settings rows exist (schema-only / partial provisioning).
-- Safe to re-run: inserts only when the key is missing.

INSERT INTO public.settings (key, value)
SELECT 'theme', jsonb_build_object(
  'primary_color', '#D4AF37',
  'secondary_color', '#1E3A5F',
  'accent_color', '#D4AF37',
  'background_color', '#0A1628'
)
WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'theme');

INSERT INTO public.settings (key, value)
SELECT 'hours', jsonb_build_object(
  'monday', jsonb_build_object('open', '09:00', 'close', '23:00', 'closed', false),
  'tuesday', jsonb_build_object('open', '09:00', 'close', '23:00', 'closed', false),
  'wednesday', jsonb_build_object('open', '09:00', 'close', '23:00', 'closed', false),
  'thursday', jsonb_build_object('open', '09:00', 'close', '23:00', 'closed', false),
  'friday', jsonb_build_object('open', '09:00', 'close', '23:00', 'closed', false),
  'saturday', jsonb_build_object('open', '09:00', 'close', '23:00', 'closed', false),
  'sunday', jsonb_build_object('open', '09:00', 'close', '23:00', 'closed', false)
)
WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'hours');
