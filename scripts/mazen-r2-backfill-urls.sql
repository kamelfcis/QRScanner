-- Mazen Store: rewrite Supabase/API storage URLs to the live R2 public base.
-- cdn.mazen-store.engazqr.com has no DNS yet, so this uses the r2.dev fallback.
-- Hostinger CNAME when the custom host should go live:
--   cdn.mazen-store  ->  pub-ca1411c7bf62470dbfeeb83b62dfd576.r2.dev
-- Run against DB mazen only. Idempotent for rows already on R2.

BEGIN;

SET ROLE service_role;

CREATE TEMP TABLE mazen_r2_backfill_counts (
  table_name text PRIMARY KEY,
  updated_rows bigint NOT NULL DEFAULT 0
);

DO $$
DECLARE
  n bigint;
BEGIN
  UPDATE public.categories
  SET
    image_url = CASE WHEN image_url ~ '/storage/v1/object/public/' THEN regexp_replace(image_url, '^https://[^/]+/storage/v1/object/public/', 'https://pub-ca1411c7bf62470dbfeeb83b62dfd576.r2.dev/') ELSE image_url END,
    banner_url = CASE WHEN banner_url ~ '/storage/v1/object/public/' THEN regexp_replace(banner_url, '^https://[^/]+/storage/v1/object/public/', 'https://pub-ca1411c7bf62470dbfeeb83b62dfd576.r2.dev/') ELSE banner_url END
  WHERE image_url ~ '/storage/v1/object/public/' OR banner_url ~ '/storage/v1/object/public/';
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO mazen_r2_backfill_counts VALUES ('categories', n);

  UPDATE public.subcategories
  SET image_url = regexp_replace(image_url, '^https://[^/]+/storage/v1/object/public/', 'https://pub-ca1411c7bf62470dbfeeb83b62dfd576.r2.dev/')
  WHERE image_url ~ '/storage/v1/object/public/';
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO mazen_r2_backfill_counts VALUES ('subcategories', n);

  UPDATE public.products
  SET image_url = regexp_replace(image_url, '^https://[^/]+/storage/v1/object/public/', 'https://pub-ca1411c7bf62470dbfeeb83b62dfd576.r2.dev/')
  WHERE image_url ~ '/storage/v1/object/public/';
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO mazen_r2_backfill_counts VALUES ('products', n);

  UPDATE public.product_gallery
  SET image_url = regexp_replace(image_url, '^https://[^/]+/storage/v1/object/public/', 'https://pub-ca1411c7bf62470dbfeeb83b62dfd576.r2.dev/')
  WHERE image_url ~ '/storage/v1/object/public/';
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO mazen_r2_backfill_counts VALUES ('product_gallery', n);

  UPDATE public.gallery
  SET image_url = regexp_replace(image_url, '^https://[^/]+/storage/v1/object/public/', 'https://pub-ca1411c7bf62470dbfeeb83b62dfd576.r2.dev/')
  WHERE image_url ~ '/storage/v1/object/public/';
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO mazen_r2_backfill_counts VALUES ('gallery', n);

  UPDATE public.offers
  SET image_url = regexp_replace(image_url, '^https://[^/]+/storage/v1/object/public/', 'https://pub-ca1411c7bf62470dbfeeb83b62dfd576.r2.dev/')
  WHERE image_url ~ '/storage/v1/object/public/';
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO mazen_r2_backfill_counts VALUES ('offers', n);

  UPDATE public.qr_codes
  SET
    logo_url = CASE WHEN logo_url ~ '/storage/v1/object/public/' THEN regexp_replace(logo_url, '^https://[^/]+/storage/v1/object/public/', 'https://pub-ca1411c7bf62470dbfeeb83b62dfd576.r2.dev/') ELSE logo_url END,
    image_url = CASE WHEN image_url ~ '/storage/v1/object/public/' THEN regexp_replace(image_url, '^https://[^/]+/storage/v1/object/public/', 'https://pub-ca1411c7bf62470dbfeeb83b62dfd576.r2.dev/') ELSE image_url END
  WHERE logo_url ~ '/storage/v1/object/public/' OR image_url ~ '/storage/v1/object/public/';
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO mazen_r2_backfill_counts VALUES ('qr_codes', n);

  UPDATE public.instapay_delivery_proofs
  SET screenshot_url = regexp_replace(screenshot_url, '^https://[^/]+/storage/v1/object/public/', 'https://pub-ca1411c7bf62470dbfeeb83b62dfd576.r2.dev/')
  WHERE screenshot_url ~ '/storage/v1/object/public/';
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO mazen_r2_backfill_counts VALUES ('instapay_delivery_proofs', n);

  UPDATE public.import_jobs
  SET file_url = regexp_replace(file_url, '^https://[^/]+/storage/v1/object/public/', 'https://pub-ca1411c7bf62470dbfeeb83b62dfd576.r2.dev/')
  WHERE file_url ~ '/storage/v1/object/public/';
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO mazen_r2_backfill_counts VALUES ('import_jobs', n);

  UPDATE public.testimonials
  SET customer_avatar_url = regexp_replace(customer_avatar_url, '^https://[^/]+/storage/v1/object/public/', 'https://pub-ca1411c7bf62470dbfeeb83b62dfd576.r2.dev/')
  WHERE customer_avatar_url ~ '/storage/v1/object/public/';
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO mazen_r2_backfill_counts VALUES ('testimonials', n);

  UPDATE public.settings
  SET value = regexp_replace(
    value::text,
    'https://[^"]+/storage/v1/object/public/',
    'https://pub-ca1411c7bf62470dbfeeb83b62dfd576.r2.dev/',
    'g'
  )::jsonb
  WHERE value::text ~ '/storage/v1/object/public/';

  UPDATE public.settings
  SET value = regexp_replace(
    value::text,
    'https://cdn\.mazen-store\.engazqr\.com/',
    'https://pub-ca1411c7bf62470dbfeeb83b62dfd576.r2.dev/',
    'g'
  )::jsonb
  WHERE value::text ~ 'cdn\.mazen-store\.engazqr\.com';
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO mazen_r2_backfill_counts VALUES ('settings', n);
END $$;

SELECT table_name, updated_rows FROM mazen_r2_backfill_counts ORDER BY table_name;

COMMIT;
