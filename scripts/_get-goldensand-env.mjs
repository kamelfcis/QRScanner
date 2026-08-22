#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createDecipheriv } from 'crypto';

const ENGaz_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../engaz-admin-wt');
const EXPECTED_REF = 'worxtjqwmlusmttekawu';

function loadEnv(root) {
  const env = {};
  for (const name of ['.env.local', '.env']) {
    const p = resolve(root, name);
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

export async function getGoldenSandEnv() {
  const env = loadEnv(ENGaz_ROOT);
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.ENGAZ_SECRETS_KEY) {
    throw new Error('Missing Engaz admin env vars');
  }

  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: doc, error: docErr } = await db
    .from('customers')
    .select('id, slug')
    .eq('slug', 'goldensand')
    .maybeSingle();
  if (docErr) throw new Error(`Customer fetch: ${docErr.message}`);
  if (!doc) throw new Error('Golden Sand customer not found');

  const { data: sec, error: secErr } = await db
    .from('customer_secrets')
    .select('ciphertext, iv, auth_tag')
    .eq('customer_id', doc.id)
    .maybeSingle();
  if (secErr) throw new Error(`Secrets fetch: ${secErr.message}`);
  if (!sec) throw new Error('Golden Sand secrets not found');

  const secrets = decryptJson({ ...sec, authTag: sec.auth_tag }, env.ENGAZ_SECRETS_KEY);
  if (secrets.supabaseProjectRef !== EXPECTED_REF) {
    throw new Error(`Unexpected project ref: ${secrets.supabaseProjectRef}`);
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: secrets.supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: secrets.supabaseServiceRoleKey,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const creds = await getGoldenSandEnv();
  console.log(
    JSON.stringify({
      url: creds.NEXT_PUBLIC_SUPABASE_URL,
      ref: EXPECTED_REF,
      hasKey: Boolean(creds.SUPABASE_SERVICE_ROLE_KEY),
    })
  );
}
