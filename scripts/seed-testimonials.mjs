#!/usr/bin/env node
/**
 * Seed customer testimonials for Warda Shamya.
 * Usage: node scripts/seed-testimonials.mjs
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
    review_ar: 'أفضل شاورما فراخ في المنطقة، الطعم أصلي والخدمة سريعة. كل مرة بنرجع لوردة شامية ومش بنندم.',
    review_en: 'The best chicken shawarma in the area — authentic taste and fast service. We keep coming back to Warda Shamya.',
    is_featured: true,
    is_visible: true,
    sort_order: 1,
  },
  {
    customer_name: 'فاطمة',
    rating: 5,
    review_ar: 'جربنا الـ Mix Grill والبروستد — ممتازين! اللحم طري والبهارات مظبوطة. أنصح بوردة شامية بقوة.',
    review_en: 'We tried the Mix Grill and broasted chicken — both excellent! Tender meat and perfect seasoning. Highly recommend Warda Shamya.',
    is_featured: true,
    is_visible: true,
    sort_order: 2,
  },
  {
    customer_name: 'محمد',
    rating: 5,
    review_ar: 'الضيافة عندهم زي البيت، الموظفين بيستقبلوك بابتسامة والأكل بيوصل سخن. تجربة تستاهل التكرار.',
    review_en: 'Their hospitality feels like home — staff greet you with a smile and food arrives hot. Worth coming back.',
    is_featured: true,
    is_visible: true,
    sort_order: 3,
  },
  {
    customer_name: 'سارة',
    rating: 5,
    review_ar: 'المكان نظيف والديكور شامي أصيل، جو عائلي حلو. الأطفال حبوا الشاورما والحمص.',
    review_en: 'Clean place with authentic Levantine décor and a lovely family atmosphere. The kids loved the shawarma and hummus.',
    is_featured: true,
    is_visible: true,
    sort_order: 4,
  },
  {
    customer_name: 'يوسف',
    rating: 5,
    review_ar: 'القائمة الرقمية سهلة وسريعة، مسحنا الـ QR وطلعنا الطلب في دقائق. ابتكار جميل من مطعم مميز.',
    review_en: 'The digital menu is easy and fast — we scanned the QR and ordered in minutes. Great innovation from a standout restaurant.',
    is_featured: true,
    is_visible: true,
    sort_order: 5,
  },
  {
    customer_name: 'نور',
    rating: 5,
    review_ar: 'الفراخ المشوية على الفحم طعمها لا يُقاوم، مع التبولة والثومية بيبقوا أفضل وجبة. وردة شامية من أفضل المطاعم.',
    review_en: 'The charcoal-grilled chicken is irresistible — with tabbouleh and garlic sauce it is the best meal. Warda Shamya is among the top restaurants.',
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
