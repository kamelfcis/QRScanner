#!/usr/bin/env node
/**
 * Enable settings.features.ai_product_images for Hetta Samaka ONLY (selnwhfvqhqbzxcuwaho).
 * Verifies GEMINI_API_KEY exists on the Vercel hettsamaka project.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { getHettSamakaEnv, EXPECTED_REF, TENANT_SLUG } from './_get-hettsamaka-env.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGaz_ROOT = resolve(ROOT, '../engaz-admin-wt');
const TEAM_ID = 'team_2IFtuuXSEcZGzUhW1VNyM0JE';

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

async function checkGeminiOnVercel(token) {
  const projectRes = await fetch(
    `https://api.vercel.com/v9/projects/hettsamaka?teamId=${TEAM_ID}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const projectJson = await projectRes.json();
  if (!projectRes.ok) {
    throw new Error(`Failed to resolve hettsamaka project: ${JSON.stringify(projectJson)}`);
  }

  const listRes = await fetch(
    `https://api.vercel.com/v9/projects/${projectJson.id}/env?teamId=${TEAM_ID}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const listJson = await listRes.json();
  if (!listRes.ok) {
    throw new Error(`Failed to list hettsamaka env: ${JSON.stringify(listJson)}`);
  }

  const gemini = (listJson.envs ?? []).find((row) => row.key === 'GEMINI_API_KEY');
  return {
    projectId: projectJson.id,
    projectName: projectJson.name,
    hasGeminiKey: Boolean(gemini?.id),
    geminiTargets: gemini?.target ?? null,
  };
}

async function enableAiProductImages(supabase) {
  const { data, error } = await supabase
    .from('settings')
    .select('id, value')
    .eq('key', 'features')
    .maybeSingle();
  if (error) throw new Error(`Settings fetch: ${error.message}`);

  const before = data?.value ?? {};
  const nextValue = { ...before, ai_product_images: true };

  if (before.ai_product_images === true) {
    return { updated: false, features: nextValue };
  }

  if (data) {
    const { error: updErr } = await supabase
      .from('settings')
      .update({ value: nextValue, updated_at: new Date().toISOString() })
      .eq('key', 'features');
    if (updErr) throw new Error(`Settings update: ${updErr.message}`);
  } else {
    const { error: insErr } = await supabase
      .from('settings')
      .insert({ key: 'features', value: nextValue });
    if (insErr) throw new Error(`Settings insert: ${insErr.message}`);
  }

  return { updated: true, features: nextValue };
}

async function main() {
  const engazEnv = loadEnv(ENGaz_ROOT);
  const token = engazEnv.VERCEL_TOKEN;
  if (!token) throw new Error('Missing VERCEL_TOKEN in engaz-admin-wt env');

  const creds = await getHettSamakaEnv();
  if (!creds.NEXT_PUBLIC_SUPABASE_URL.includes(EXPECTED_REF)) {
    throw new Error(`Refusal: URL does not target ${EXPECTED_REF} (${TENANT_SLUG} only)`);
  }

  const supabase = createClient(creds.NEXT_PUBLIC_SUPABASE_URL, creds.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const featureResult = await enableAiProductImages(supabase);
  const vercel = await checkGeminiOnVercel(token);

  const { data: verifyRow } = await supabase
    .from('settings')
    .select('value, updated_at')
    .eq('key', 'features')
    .maybeSingle();

  const report = {
    tenant: TENANT_SLUG,
    supabase_ref: EXPECTED_REF,
    customer_id: creds.customerId,
    ai_product_images_enabled: verifyRow?.value?.ai_product_images === true,
    features: verifyRow?.value ?? null,
    featureFlagUpdate: featureResult,
    vercel,
  };

  console.log(JSON.stringify(report, null, 2));

  if (verifyRow?.value?.ai_product_images !== true) {
    throw new Error('ai_product_images is not true after enable');
  }
  if (!vercel.hasGeminiKey) {
    console.warn('WARNING: GEMINI_API_KEY is not set on Vercel hettsamaka project');
  }
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
