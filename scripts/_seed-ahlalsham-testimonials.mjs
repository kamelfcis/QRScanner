#!/usr/bin/env node
/**
 * Seed customer testimonials for Ahl El Sham (عطارة اهل الشام) ONLY.
 * Requires explicit --confirm flag.
 *
 * Usage:
 *   node scripts/_seed-ahlalsham-testimonials.mjs          # dry-run preview
 *   node scripts/_seed-ahlalsham-testimonials.mjs --confirm
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { createDecipheriv } from 'crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGaz_ROOT = resolve(ROOT, '../engaz-admin-wt');
const CUSTOMER_ID = 'e8438bc2-e5e9-42a2-9eb0-6d48081740d0';
const EXPECTED_REF = 'qfwxghcshhvdozwpmlov';

const TESTIMONIALS = [
  {
    customer_name: 'أميرة',
    rating: 5,
    review_ar:
      'بهارات عطارة أهل الشام أصلية وريحتها قوية، جربت الكاري والكمون والفرق واضح جداً عن أي محل تاني. بقيت أطلب منهم دايماً.',
    review_en:
      'Ahl El Sham spices are authentic and aromatic — their curry and cumin are noticeably better than anywhere else. I order from them every time now.',
    is_featured: true,
    is_visible: true,
    sort_order: 1,
  },
  {
    customer_name: 'خالد',
    rating: 5,
    review_ar:
      'الأعشاب الطبية عندهم طازة ومرتبة، الزعتر والمرمية والحلبة كلها نظيفة ومعبأة باحتراف. خدمة ممتازة.',
    review_en:
      'Their medicinal herbs are fresh and well packed — thyme, sage, and fenugreek are all clean and professionally sealed. Excellent service.',
    is_featured: true,
    is_visible: true,
    sort_order: 2,
  },
  {
    customer_name: 'ليلى',
    rating: 5,
    review_ar:
      'التوصيل سريع والطلب وصل مرتب، حتى الزيتون والمخللات كانت مغلفة كويس. جودة عالية وسعر مناسب.',
    review_en:
      'Fast delivery and neatly packed order — even the olives and pickles were well sealed. High quality at fair prices.',
    is_featured: true,
    is_visible: true,
    sort_order: 3,
  },
  {
    customer_name: 'Omar',
    rating: 4,
    review_ar:
      'اشتريت خلطة بهارات للكبسة والشاورما، الطعم زي اللي في المطاعم الكبيرة. أنصح أي حد بيحب يطبخ بيتي.',
    review_en:
      'I bought their kabsa and shawarma spice blends — tastes just like the big restaurants. Highly recommend for home cooking.',
    is_featured: false,
    is_visible: true,
    sort_order: 4,
  },
  {
    customer_name: 'منى',
    rating: 5,
    review_ar:
      'الحمص والطحينة عندهم طعمهم أصلي، والسمسم والفستق الحلبي جودتهم ممتازة. محل ثقة للعائلة.',
    review_en:
      'Their hummus and tahini taste authentic, and the sesame and pistachios are top quality. A trusted shop for the whole family.',
    is_featured: true,
    is_visible: true,
    sort_order: 5,
  },
  {
    customer_name: 'Samir',
    rating: 5,
    review_ar:
      'من أول زيارة حسيت إنهم فاهمين في التوابل. ساعدوني أختار بهارات للمشاوي والفرن، والنتيجة كانت رائعة.',
    review_en:
      'From my first visit I could tell they really know spices. They helped me pick blends for grilling and baking — the results were amazing.',
    is_featured: false,
    is_visible: true,
    sort_order: 6,
  },
  {
    customer_name: 'هدى',
    rating: 4,
    review_ar:
      'القائمة الرقمية سهلة وأقدر أطلب من الموبايل بسرعة. البهارات والأعشاب بتوصل بحالة ممتازة.',
    review_en:
      'The digital menu is easy and I can order quickly from my phone. Spices and herbs always arrive in excellent condition.',
    is_featured: false,
    is_visible: true,
    sort_order: 7,
  },
];

function loadEnvFile(name, root = ROOT) {
  const env = {};
  const p = resolve(root, name);
  if (!existsSync(p)) return env;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[t.slice(0, i).trim()] = val;
  }
  return env;
}

function decryptJson({ ciphertext, iv, authTag }, keyB64) {
  const key = Buffer.from(keyB64, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]);
  return JSON.parse(plain.toString('utf8'));
}

async function resolveAhlalshamClient() {
  const engazEnv = { ...loadEnvFile('.env', ENGaz_ROOT), ...loadEnvFile('.env.local', ENGaz_ROOT) };
  if (!engazEnv.NEXT_PUBLIC_SUPABASE_URL || !engazEnv.SUPABASE_SERVICE_ROLE_KEY || !engazEnv.ENGAZ_SECRETS_KEY) {
    throw new Error('Missing Engaz admin env vars');
  }
  const adminUrl = engazEnv.NEXT_PUBLIC_SUPABASE_URL;
  if (!adminUrl.includes('zvngjznpvibciituiced')) {
    throw new Error('Unexpected Engaz admin URL host (ref mismatch)');
  }

  const admin = createClient(engazEnv.NEXT_PUBLIC_SUPABASE_URL, engazEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: customer, error: cErr } = await admin
    .from('customers')
    .select('id, slug, display_name_ar, display_name_en')
    .eq('id', CUSTOMER_ID)
    .maybeSingle();
  if (cErr) throw new Error(`Customer fetch: ${cErr.message}`);
  if (!customer) throw new Error('Ahl El Sham customer not found');

  const { data: sec, error: secErr } = await admin
    .from('customer_secrets')
    .select('ciphertext, iv, auth_tag')
    .eq('customer_id', customer.id)
    .maybeSingle();
  if (secErr) throw new Error(`Secrets fetch: ${secErr.message}`);
  if (!sec) throw new Error('Ahl El Sham secrets not found');

  const secrets = decryptJson({ ...sec, authTag: sec.auth_tag }, engazEnv.ENGAZ_SECRETS_KEY);
  if (secrets.supabaseProjectRef !== EXPECTED_REF) {
    throw new Error(`Unexpected project ref: ${secrets.supabaseProjectRef} (expected ${EXPECTED_REF})`);
  }
  if (!secrets.supabaseServiceRoleKey) {
    throw new Error('No service role key in customer secrets');
  }

  const sb = createClient(secrets.supabaseUrl, secrets.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return { customer, secrets, sb };
}

async function main() {
  const confirmed = process.argv.includes('--confirm');
  const { customer, secrets, sb } = await resolveAhlalshamClient();

  console.log('Target tenant: Ahl El Sham ONLY');
  console.log('Customer slug:', customer.slug);
  console.log('Customer id:', customer.id);
  console.log('Supabase ref:', secrets.supabaseProjectRef);
  console.log('Testimonials to seed:', TESTIMONIALS.length);

  const { count: beforeCount, error: countErr } = await sb
    .from('testimonials')
    .select('*', { count: 'exact', head: true });
  if (countErr) throw new Error(`Count failed: ${countErr.message}`);

  console.log(`Existing testimonials: ${beforeCount ?? 0}`);

  if (!confirmed) {
    console.log('\nDry run — no changes made.');
    console.log('Re-run with --confirm to insert testimonials.');
    console.log('\nPreview:');
    for (const t of TESTIMONIALS) {
      console.log(`  • ${t.customer_name} (${t.rating}★) featured=${t.is_featured}`);
    }
    return;
  }

  if ((beforeCount ?? 0) > 0) {
    const { data: existing, error: listErr } = await sb
      .from('testimonials')
      .select('id, customer_name, rating, is_featured, is_visible, sort_order')
      .order('sort_order', { ascending: true });
    if (listErr) throw new Error(`List failed: ${listErr.message}`);

    console.log('\nSkipping insert — testimonials already exist:');
    console.log(JSON.stringify(existing, null, 2));

    const { count: verifyCount, error: verifyErr } = await sb
      .from('testimonials')
      .select('*', { count: 'exact', head: true });
    if (verifyErr) throw new Error(`Verify count failed: ${verifyErr.message}`);
    console.log(`\nVerification count: ${verifyCount ?? 0}`);
    return;
  }

  console.log('\nInserting testimonials...');
  const { data: inserted, error: insertErr } = await sb.from('testimonials').insert(TESTIMONIALS).select();
  if (insertErr) throw new Error(`Insert failed: ${insertErr.message}`);

  console.log(`Inserted ${inserted.length} testimonials:`);
  for (const t of inserted) {
    console.log(`  • ${t.customer_name} (${t.rating}★): ${t.review_ar?.slice(0, 55)}…`);
  }

  const { count: afterCount, error: afterErr } = await sb
    .from('testimonials')
    .select('*', { count: 'exact', head: true });
  if (afterErr) throw new Error(`Verify count failed: ${afterErr.message}`);

  const report = {
    customer_id: CUSTOMER_ID,
    project_ref: EXPECTED_REF,
    slug: customer.slug,
    inserted: inserted.length,
    verification_count: afterCount ?? 0,
    seeded_at: new Date().toISOString(),
  };

  console.log('\nSeed report:');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
