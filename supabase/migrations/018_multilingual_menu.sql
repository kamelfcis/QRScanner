-- Warda Shamya Digital Restaurant Platform
-- Multilingual menu fields (French / Dutch)
-- Version: 018
-- Date: 2026-08-15

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS name_fr VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name_nl VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description_fr TEXT,
  ADD COLUMN IF NOT EXISTS description_nl TEXT;

ALTER TABLE public.subcategories
  ADD COLUMN IF NOT EXISTS name_fr VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name_nl VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description_fr TEXT,
  ADD COLUMN IF NOT EXISTS description_nl TEXT;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS name_fr VARCHAR(255),
  ADD COLUMN IF NOT EXISTS name_nl VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description_fr TEXT,
  ADD COLUMN IF NOT EXISTS description_nl TEXT;

-- Story text FR/NL in restaurant settings JSON (landing page parity)
UPDATE public.settings
SET value = value || '{
  "story_title_fr": null,
  "story_title_nl": null,
  "story_p1_fr": null,
  "story_p1_nl": null,
  "story_p2_fr": null,
  "story_p2_nl": null
}'::jsonb,
    updated_at = now()
WHERE key = 'restaurant'
  AND NOT (value ? 'story_title_fr');
