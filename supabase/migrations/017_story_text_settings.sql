-- Warda Shamya Digital Restaurant Platform
-- Editable Our Story text in restaurant settings JSON
-- Version: 017
-- Date: 2026-08-15

UPDATE public.settings
SET value = value || '{
  "story_title_en": null,
  "story_title_ar": null,
  "story_p1_en": null,
  "story_p1_ar": null,
  "story_p2_en": null,
  "story_p2_ar": null
}'::jsonb,
    updated_at = now()
WHERE key = 'restaurant'
  AND NOT (value ? 'story_title_en');
