-- Tier 2 ops: auto kitchen print + ready WhatsApp settings, ready notification tracking
-- Version: 030
-- Date: 2026-09-17

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ready_whatsapp_sent_at timestamptz;

UPDATE public.settings
SET value = jsonb_set(COALESCE(value, '{}'::jsonb), '{auto_print_kitchen_ticket}', 'false'::jsonb, true),
    updated_at = now()
WHERE key = 'restaurant'
  AND NOT (COALESCE(value, '{}'::jsonb) ? 'auto_print_kitchen_ticket');

UPDATE public.settings
SET value = jsonb_set(COALESCE(value, '{}'::jsonb), '{whatsapp_on_ready}', 'true'::jsonb, true),
    updated_at = now()
WHERE key = 'restaurant'
  AND NOT (COALESCE(value, '{}'::jsonb) ? 'whatsapp_on_ready');
