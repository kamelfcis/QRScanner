-- Ensure link_page settings row exists (Ostol seafood social links seed).
-- Safe to re-run: inserts only when the key is missing.

INSERT INTO public.settings (key, value)
SELECT 'link_page', jsonb_build_object(
  'enabled', true,
  'title_ar', 'أسطول سي فود',
  'title_en', 'Ostol Seafood',
  'subtitle_ar', 'تابعنا وتواصل معنا',
  'subtitle_en', 'Follow us & get in touch',
  'background', '#0a1628',
  'button_color', '#1E3A5F',
  'button_radius', 'pill',
  'logo_url', null,
  'links', jsonb_build_object(
    'facebook', jsonb_build_object('enabled', true, 'url', 'https://www.facebook.com/share/18yJx3VgWC/'),
    'instagram', jsonb_build_object('enabled', true, 'url', 'https://www.instagram.com/as.seafood/'),
    'tiktok', jsonb_build_object('enabled', true, 'url', 'https://www.tiktok.com/@as.seafood'),
    'phone', jsonb_build_object('enabled', true, 'value', '01127244074'),
    'whatsapp', jsonb_build_object('enabled', false, 'value', '01127244074'),
    'menu', jsonb_build_object('enabled', true)
  )
)
WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'link_page');
