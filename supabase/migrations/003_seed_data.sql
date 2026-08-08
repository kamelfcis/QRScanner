-- Aklet Gambary Digital Restaurant Platform
-- Seed Data
-- Version: 003
-- Date: 2025-08-03

-- ============================================================
-- DEFAULT SETTINGS
-- ============================================================
INSERT INTO public.settings (key, value) VALUES
  ('restaurant', '{
    "name_ar": "أكلة جمبري أنا",
    "name_en": "Aklet Gambary",
    "phone": "",
    "whatsapp": "",
    "instagram": "",
    "facebook": "",
    "tiktok": "",
    "address_ar": "",
    "address_en": "",
    "currency": "EGP",
    "tax_rate": 0,
    "service_charge_rate": 0,
    "qr_target_path": "/"
  }'::jsonb),
  ('theme', '{
    "primary_color": "#0E7490",
    "secondary_color": "#155E75",
    "accent_color": "#F97316",
    "background_color": "#F0FDFA"
  }'::jsonb),
  ('hours', '{
    "saturday": {"open": "09:00", "close": "23:00"},
    "sunday": {"open": "09:00", "close": "23:00"},
    "monday": {"open": "09:00", "close": "23:00"},
    "tuesday": {"open": "09:00", "close": "23:00"},
    "wednesday": {"open": "09:00", "close": "23:00"},
    "thursday": {"open": "09:00", "close": "23:00"},
    "friday": {"closed": true}
  }'::jsonb);

-- ============================================================
-- DEFAULT CATEGORIES
-- ============================================================
INSERT INTO public.categories (name_ar, name_en, sort_order) VALUES
  ('المقبلات', 'Appetizers', 1),
  ('الشوربات', 'Soups', 2),
  ('السلط', 'Salads', 3),
  ('الأطباق الرئيسية', 'Main Courses', 4),
  ('المشروبات', 'Beverages', 5),
  ('الحلويات', 'Desserts', 6);

-- ============================================================
-- SAMPLE PRODUCTS
-- ============================================================
INSERT INTO public.products (
  category_id, name_ar, name_en, description_ar, description_en,
  dining_price, takeaway_price, is_available, is_popular
) VALUES
  (
    (SELECT id FROM public.categories WHERE name_en = 'Appetizers' LIMIT 1),
    'فتوش', 'Grilled Shrimp',
    'سلطة تقليدية مع خبز مقرمش', 'Traditional salad with crispy bread',
    25.00, 22.00, true, true
  ),
  (
    (SELECT id FROM public.categories WHERE name_en = 'Main Courses' LIMIT 1),
    'كبسة لحم', 'Seafood Tagine',
    'أرز مع لحم مطهو على الطريقة التقليدية', 'Rice with traditionally cooked lamb',
    65.00, 58.00, true, true
  ),
  (
    (SELECT id FROM public.categories WHERE name_en = 'Beverages' LIMIT 1),
    'شاي بالنعناع', 'Lemonade',
    'شاي أخضر مع نعناع طازج', 'Green tea with fresh mint',
    8.00, 7.00, true, false
  );
