-- Warda Shamya Digital Restaurant Platform
-- Story section image URL in restaurant settings JSON
-- Version: 012
-- Date: 2025-08-05

UPDATE public.settings
SET value = value || '{"story_image_url": null}'::jsonb,
    updated_at = now()
WHERE key = 'restaurant'
  AND NOT (value ? 'story_image_url');
