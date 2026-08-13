import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
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
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[t.slice(0, i).trim()] = val;
    }
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !service) {
  console.error('Missing Engaz URL or service role');
  process.exit(1);
}

const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
const ref = (url.match(/https?:\/\/([^.]+)/) || [])[1];

async function tryManagementSql(query) {
  const token = env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) return { skipped: true, reason: 'no management token' };
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text.slice(0, 500) };
}

async function ensureBuckets() {
  const buckets = [
    {
      id: 'registration-logos',
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
    {
      id: 'registration-menus',
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
    },
  ];
  const results = [];
  for (const b of buckets) {
    const { data: existing } = await db.storage.getBucket(b.id);
    if (existing) {
      const { error } = await db.storage.updateBucket(b.id, {
        public: b.public,
        fileSizeLimit: b.fileSizeLimit,
        allowedMimeTypes: b.allowedMimeTypes,
      });
      results.push({ id: b.id, action: 'updated', error: error?.message || null });
    } else {
      const { error } = await db.storage.createBucket(b.id, {
        public: b.public,
        fileSizeLimit: b.fileSizeLimit,
        allowedMimeTypes: b.allowedMimeTypes,
      });
      results.push({ id: b.id, action: 'created', error: error?.message || null });
    }
  }
  return results;
}

async function probeColumns() {
  const { error } = await db.from('customers').select('owner_email, registration_source, logo_path').limit(1);
  if (!error) return { present: true };
  return { present: false, message: error.message };
}

const sqlPath = resolve(
  ROOT,
  'engaz-supabase/migrations/002_registration_applications.sql'
);
const sql = existsSync(sqlPath)
  ? readFileSync(sqlPath, 'utf8')
  : readFileSync(
      resolve(
        ROOT,
        '../engaz-admin-wt/engaz-supabase/migrations/002_registration_applications.sql'
      ),
      'utf8'
    );

const mgmt = await tryManagementSql(sql);
const buckets = await ensureBuckets();
const columns = await probeColumns();

console.log(
  JSON.stringify(
    {
      project: ref,
      managementSql: mgmt,
      buckets,
      columns,
    },
    null,
    2
  )
);

if (!columns.present && mgmt.skipped) {
  process.exitCode = 2;
}
