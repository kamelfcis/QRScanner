#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { getGoldenSandEnv } from './_get-goldensand-env.mjs';

const ENGaz_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../engaz-admin-wt');
const GOLDENSAND_PROJECT = 'prj_5UnGretJrAeJAhfn2yhnMVMcBcPV';

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

async function main() {
  const engazEnv = loadEnv(ENGaz_ROOT);
  const token = engazEnv.VERCEL_TOKEN;
  if (!token) throw new Error('Missing VERCEL_TOKEN in engaz-admin-wt env');

  const gsCreds = await getGoldenSandEnv();
  const gsSb = createClient(gsCreds.NEXT_PUBLIC_SUPABASE_URL, gsCreds.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: featuresRow } = await gsSb
    .from('settings')
    .select('value, updated_at')
    .eq('key', 'features')
    .maybeSingle();

  const gsEnvs = await vercelEnv(GOLDENSAND_PROJECT, token);
  const gemini = gsEnvs.find((e) => e.key === 'GEMINI_API_KEY');
  const geminiModel = gsEnvs.find((e) => e.key === 'GEMINI_IMAGE_MODEL');

  const adminSb = createClient(
    engazEnv.NEXT_PUBLIC_SUPABASE_URL,
    engazEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
  const { data: customer } = await adminSb
    .from('customers')
    .select('id, slug, features, vercel_project_id')
    .eq('slug', 'goldensand')
    .maybeSingle();

  const list = await fetch('https://api.vercel.com/v9/projects?search=doctorburger', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const pj = await list.json();
  const dbProject = pj.projects?.find((p) => p.name === 'doctorburger');
  let dbGemini = null;
  if (dbProject) {
    const dbEnvs = await vercelEnv(dbProject.id, token);
    dbGemini = dbEnvs.find((e) => e.key === 'GEMINI_API_KEY');
  }

  console.log(
    JSON.stringify(
      {
        goldensand: {
          featuresSetting: featuresRow,
          vercelProjectId: GOLDENSAND_PROJECT,
          hasGeminiKey: Boolean(gemini?.id),
          geminiTargets: gemini?.target ?? null,
          hasGeminiImageModel: Boolean(geminiModel?.id),
        },
        engazAdminCustomer: customer,
        doctorburger: {
          projectId: dbProject?.id ?? null,
          hasGeminiKey: Boolean(dbGemini?.id),
        },
        localGeminiKeyAvailable: Boolean(engazEnv.GEMINI_API_KEY?.trim()),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
