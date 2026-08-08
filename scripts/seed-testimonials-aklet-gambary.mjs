#!/usr/bin/env node
/**
 * Seed customer testimonials for Aklet Gambary (أكلة جمبري أنا).
 * Usage: node scripts/seed-testimonials-aklet-gambary.mjs
 * Skips insert if testimonials already exist.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function loadEnv() {
  const envPath = join(ROOT, '.env.local');
  if (!existsSync(envPath)) throw new Error('.env.local not found');
  const env = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const TESTIMONIALS = [
  {
    customer_name: 'أحمد',
    rating: 5,
    review_ar:
      'الجمبري المشوي عندهم طازج ومقرمش، والبهارات مظبوطة. أكلة جمبري أنا من أحلى مطاعم المأكولات البحرية في المنطقة.',
    review_en:
      'Their grilled shrimp is fresh and crispy with perfect seasoning. Aklet Gambary is one of the best seafood spots in the area.',
    is_featured: true,
    is_visible: true,
    sort_order: 1,
  },
  {
    customer_name: 'فاطمة',
    rating: 5,
    review_ar:
      'جربنا السمك المقلي والجمبري بالثوم — طعم لا يُقاوم! الخدمة سريعة والموظفين محترمين جداً.',
    review_en:
      'We tried the fried fish and garlic shrimp — irresistible taste! Fast service and very courteous staff.',
    is_featured: true,
    is_visible: true,
    sort_order: 2,
  },
  {
    customer_name: 'محمد',
    rating: 5,
    review_ar:
      'السمك طازج كل يوم والجمبري كبير الحجم. الطعم أصلي والأسعار مناسبة — بنرجع دايماً لأكلة جمبري أنا.',
    review_en:
      'Fresh fish every day and large shrimp. Authentic taste and fair prices — we always come back to Aklet Gambary.',
    is_featured: true,
    is_visible: true,
    sort_order: 3,
  },
  {
    customer_name: 'سارة',
    rating: 4,
    review_ar:
      'المكان نظيف والجو عائلي حلو. الأطفال حبوا الجمبري المقلي والسمك المشوي. خدمة ممتازة وابتسامة من أول ما تدخل.',
    review_en:
      'Clean place with a lovely family atmosphere. The kids loved the fried shrimp and grilled fish. Excellent service from the moment you walk in.',
    is_featured: true,
    is_visible: true,
    sort_order: 4,
  },
  {
    customer_name: 'يوسف',
    rating: 5,
    review_ar:
      'القائمة الرقمية سهلة وسريعة، مسحنا الـ QR وطلعنا طلب الجمبري والسمك في دقائق. تجربة ممتازة من مطعم مميز.',
    review_en:
      'The digital menu is easy and fast — we scanned the QR and ordered shrimp and fish in minutes. An excellent experience from a standout restaurant.',
    is_featured: true,
    is_visible: true,
    sort_order: 5,
  },
  {
    customer_name: 'نور',
    rating: 5,
    review_ar:
      'الجمبري بالزبدة والثوم طعمه رائع، والسمك على الفحم طري من جوه. أكلة جمبري أنا يستحق كل نجمة.',
    review_en:
      'The butter-garlic shrimp tastes amazing, and the charcoal fish is tender inside. Aklet Gambary deserves every star.',
    is_featured: true,
    is_visible: true,
    sort_order: 6,
  },
];

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { count, error: countError } = await supabase
    .from('testimonials')
    .select('*', { count: 'exact', head: true });

  if (countError) throw countError;

  console.log(`Existing testimonials: ${count ?? 0}`);

  if ((count ?? 0) > 0) {
    console.log('Skipping seed — testimonials already exist.');
    const { data: existing } = await supabase
      .from('testimonials')
      .select('customer_name, review_ar, rating, is_featured, is_visible')
      .order('sort_order', { ascending: true });
    console.log(JSON.stringify(existing, null, 2));
    return;
  }

  const { data, error } = await supabase.from('testimonials').insert(TESTIMONIALS).select();

  if (error) throw error;

  console.log(`Inserted ${data.length} testimonials:`);
  for (const t of data) {
    console.log(`  • ${t.customer_name} (${t.rating}★): ${t.review_ar?.slice(0, 60)}…`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
