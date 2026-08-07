-- Warda Shamya Digital Restaurant Platform
-- Theme defaults + hero image URL in settings JSON
-- Version: 011
-- Date: 2025-08-05

-- Ensure hero_image_url exists on restaurant settings (nullable)
UPDATE public.settings
SET value = value || '{"hero_image_url": null}'::jsonb,
    updated_at = now()
WHERE key = 'restaurant'
  AND NOT (value ? 'hero_image_url');

-- Backfill missing theme keys; existing admin values win (defaults || value)
UPDATE public.settings
SET value = jsonb_build_object(
      'primary_color', '#FFB700',
      'secondary_color', '#6B0F1A',
      'accent_color', '#FFB700',
      'background_color', '#FAF8F5'
    ) || value,
    updated_at = now()
WHERE key = 'theme';
