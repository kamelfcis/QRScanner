#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = {};
for (const name of ['.env.local', '.env']) {
  const p = resolve(ROOT, name);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[t.slice(0, i).trim()] = val;
  }
}

const token = env.VERCEL_TOKEN;
if (!token) {
  console.error(JSON.stringify({ ok: false, error: 'Missing VERCEL_TOKEN in .env.local' }));
  process.exit(1);
}

const res = await fetch(
  'https://api.vercel.com/v9/projects/prj_FNonretsEgvpkDj2BgVd35DYW7Aj/env?decrypt=true',
  { headers: { Authorization: `Bearer ${token}` } }
);
if (!res.ok) {
  console.error(JSON.stringify({ ok: false, error: `Vercel env fetch failed: ${res.status}` }));
  process.exit(1);
}

const json = await res.json();
const pick = (key) => {
  const row = (json.envs ?? []).find(
    (e) => e.key === key && (e.target ?? []).includes('production') && e.value
  ) ?? (json.envs ?? []).find(
    (e) => e.key === key && (e.target ?? []).includes('development') && e.value
  );
  return row?.value ?? null;
};

const url = pick('NEXT_PUBLIC_SUPABASE_URL');
const key = pick('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !key) {
  console.error(JSON.stringify({ ok: false, error: 'Missing Aklet Supabase env on Vercel production' }));
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: row, error: readErr } = await supabase
  .from('settings')
  .select('value')
  .eq('key', 'restaurant')
  .single();

if (readErr) {
  console.error(JSON.stringify({ ok: false, error: readErr.message }));
  process.exit(1);
}

const current = row?.value && typeof row.value === 'object' ? row.value : {};
const updated = {
  ...current,
  enable_dine_in: false,
  enable_takeaway: true,
  enable_delivery: true,
};

const { error: updateErr } = await supabase
  .from('settings')
  .update({ value: updated, updated_at: new Date().toISOString() })
  .eq('key', 'restaurant');

if (updateErr) {
  console.error(JSON.stringify({ ok: false, error: updateErr.message }));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      ref: url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1],
      enable_dine_in: updated.enable_dine_in,
      enable_takeaway: updated.enable_takeaway,
      enable_delivery: updated.enable_delivery,
    },
    null,
    2
  )
);
