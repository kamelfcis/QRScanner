#!/usr/bin/env node
/** Patch Ala Keefak restaurant settings: dine-in + delivery, no takeaway. */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REF = 'pytmkruoyyhxfktnkpuu';

function loadEnvFile(name) {
  const env = {};
  const p = resolve(ROOT, name);
  if (!existsSync(p)) return env;
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
  return env;
}

const env = { ...loadEnvFile('.env'), ...loadEnvFile('.env.local') };
const token = env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error(JSON.stringify({ ok: false, error: 'Missing SUPABASE_ACCESS_TOKEN in .env.local' }));
  process.exit(1);
}

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${text}`);
  return JSON.parse(text);
}

const beforeRows = await sql(`SELECT value FROM public.settings WHERE key = 'restaurant' LIMIT 1;`);
const before = beforeRows[0]?.value ?? {};

await sql(`
  UPDATE public.settings
  SET value = COALESCE(value, '{}'::jsonb)
    || jsonb_build_object(
      'enable_dine_in', true,
      'enable_takeaway', false,
      'enable_delivery', true
    ),
    updated_at = now()
  WHERE key = 'restaurant';
`);

const afterRows = await sql(`
  SELECT
    value->>'enable_dine_in' AS enable_dine_in,
    value->>'enable_takeaway' AS enable_takeaway,
    value->>'enable_delivery' AS enable_delivery
  FROM public.settings
  WHERE key = 'restaurant'
  LIMIT 1;
`);

console.log(
  JSON.stringify(
    {
      ok: true,
      ref: REF,
      before: {
        enable_dine_in: before.enable_dine_in,
        enable_takeaway: before.enable_takeaway,
        enable_delivery: before.enable_delivery,
      },
      after: afterRows[0],
    },
    null,
    2
  )
);
