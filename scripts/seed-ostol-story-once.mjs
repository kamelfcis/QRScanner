import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv(file) {
  const env = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq);
    let val = trimmed.slice(eq + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const OSTOL_REF = 'mylxcokqjbaazlfdrnts';
const envFile = process.argv[2] || '.env.ostol.production';
const fileEnv = loadEnv(resolve(process.cwd(), envFile));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY || '';
if (!url.includes(OSTOL_REF)) {
  throw new Error('Refusing seed: NEXT_PUBLIC_SUPABASE_URL is not Ostol');
}
if (!serviceKey || serviceKey.includes('SENSITIVE') || !serviceKey.startsWith('eyJ')) {
  throw new Error('Refusing seed: Ostol service role key is missing or placeholder');
}

const story = {
  story_title_ar: 'قصتنا',
  story_title_en: 'Our Story',
  story_p1_ar:
    'أسطول سي فود وُلد من شغفنا بثمار البحر الطازة. كل يوم نختار أفضل الأسماك والجمبري والكلاماري بعناية، ونقدّمها بمعايير نظافة وجودة لا نتنازل عنها — من البحر إلى مائدتكم بأصالة المطبخ البحري المصري.',
  story_p1_en:
    'Ostol Seafood was born from a passion for the freshest catch. Every day we hand-pick the finest fish, shrimp, and seafood — served with strict hygiene and quality, from sea to table with authentic Egyptian coastal flavor.',
  story_p2_ar:
    'سواء جلستم عندنا في المطعم أو طلبتم للمنزل، فريقنا يخدمكم بسرعة واحترافية. ثقتكم هي ما يدفعنا نكبر ونحافظ على مستوى واحد في كل طلب.',
  story_p2_en:
    'Dine in with us or order for delivery — our team serves you with speed and care. Your trust is what keeps us growing, order after order.',
};

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await supabase
  .from('settings')
  .select('value')
  .eq('key', 'restaurant')
  .single();

if (error) throw error;

const nameEn = data.value?.name_en ?? '';
const nameAr = data.value?.name_ar ?? '';
if (!/ostol/i.test(nameEn) && !/أسطول/.test(nameAr)) {
  throw new Error(`Refusing seed: restaurant name is not Ostol (${nameEn})`);
}

const { error: updateError } = await supabase
  .from('settings')
  .update({
    value: { ...data.value, ...story },
    updated_at: new Date().toISOString(),
  })
  .eq('key', 'restaurant');

if (updateError) throw updateError;

const { data: after, error: afterError } = await supabase
  .from('settings')
  .select('value')
  .eq('key', 'restaurant')
  .single();

if (afterError) throw afterError;

console.log(
  JSON.stringify({
    seeded_project: OSTOL_REF,
    name_en: after.value.name_en,
    story_title_en: after.value.story_title_en,
    story_title_ar: after.value.story_title_ar,
    story_p1_en_ok: after.value.story_p1_en?.startsWith('Ostol Seafood'),
    story_p2_en_ok: after.value.story_p2_en?.startsWith('Dine in'),
  })
);
