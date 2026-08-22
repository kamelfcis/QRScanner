#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { getGoldenSandEnv } from './_get-goldensand-env.mjs';

const ENGaz_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../engaz-admin-wt');
const GOLDENSAND_PROJECT = 'prj_5UnGretJrAeJAhfn2yhnMVMcBcPV';
const DOCTORBURGER_PROJECT = 'prj_xxx'; // resolved dynamically

function loadEnv(root) {
  const env = {};
  for (const name of ['.env.vercel.production', '.env.local', '.env']) {
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

async function vercelEnv(projectId, token) {
  const r = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Vercel env list failed: ${JSON.stringify(j)}`);
  return j.envs ?? [];
}

function pickEnv(envs, key) {
  const e = envs.find((x) => x.key === key);
  return e?.value ?? null;
}

async function main() {
  const engazEnv = loadEnv(ENGaz_ROOT);
  const token = engazEnv.VERCEL_TOKEN;
  if (!token) throw new Error('Missing VERCEL_TOKEN');

  const gsCreds = await getGoldenSandEnv();
  const gsSb = createClient(gsCreds.NEXT_PUBLIC_SUPABASE_URL, gsCreds.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: restaurant } = await gsSb
    .from('settings')
    .select('value')
    .eq('key', 'restaurant')
    .maybeSingle();

  const gsEnvs = await vercelEnv(GOLDENSAND_PROJECT, token);

  const list = await fetch('https://api.vercel.com/v9/projects?search=doctorburger', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const pj = await list.json();
  const dbProject = pj.projects?.find((p) => p.name === 'doctorburger');
  const dbEnvs = dbProject ? await vercelEnv(dbProject.id, token) : [];

  const keys = [
    'NEXT_PUBLIC_APP_NAME',
    'NEXT_PUBLIC_APP_NAME_AR',
    'NEXT_PUBLIC_SITE_URL',
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_TENANT',
  ];

  const out = {
    goldensand: {
      vercel: Object.fromEntries(keys.map((k) => [k, pickEnv(gsEnvs, k)])),
      restaurantSettings: restaurant?.value ?? null,
    },
    doctorburger: {
      vercel: Object.fromEntries(keys.map((k) => [k, pickEnv(dbEnvs, k)])),
    },
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
