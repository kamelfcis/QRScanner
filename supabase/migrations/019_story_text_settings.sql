-- Warda Shamya Digital Restaurant Platform
-- Our Story title/paragraphs in restaurant settings JSON
-- Version: 019
-- Date: 2026-10-05
-- Idempotent: adds missing keys as null without overwriting existing values.

UPDATE public.settings
SET value = value
  || CASE WHEN value ? 'story_title_ar' THEN '{}'::jsonb ELSE '{"story_title_ar": null}'::jsonb END
  || CASE WHEN value ? 'story_title_en' THEN '{}'::jsonb ELSE '{"story_title_en": null}'::jsonb END
  || CASE WHEN value ? 'story_p1_ar' THEN '{}'::jsonb ELSE '{"story_p1_ar": null}'::jsonb END
  || CASE WHEN value ? 'story_p1_en' THEN '{}'::jsonb ELSE '{"story_p1_en": null}'::jsonb END
  || CASE WHEN value ? 'story_p2_ar' THEN '{}'::jsonb ELSE '{"story_p2_ar": null}'::jsonb END
  || CASE WHEN value ? 'story_p2_en' THEN '{}'::jsonb ELSE '{"story_p2_en": null}'::jsonb END,
    updated_at = now()
WHERE key = 'restaurant';
