-- Warda Shamya Digital Restaurant Platform
-- Contact defaults: Egypt location + missing JSON keys
-- Version: 013
-- Date: 2025-08-05

-- Ensure optional contact keys exist on restaurant settings
UPDATE public.settings
SET value = value || '{"google_maps_url": null, "email": null}'::jsonb,
    updated_at = now()
WHERE key = 'restaurant'
  AND (NOT (value ? 'google_maps_url') OR NOT (value ? 'email'));

-- Backfill empty addresses with Egypt defaults (admin-set values are preserved)
UPDATE public.settings
SET value = jsonb_set(
      jsonb_set(
        value,
        '{address_ar}',
        to_jsonb(COALESCE(NULLIF(trim(value->>'address_ar'), ''), 'مصر'))
      ),
      '{address_en}',
      to_jsonb(COALESCE(NULLIF(trim(value->>'address_en'), ''), 'Egypt'))
    ),
    updated_at = now()
WHERE key = 'restaurant';
