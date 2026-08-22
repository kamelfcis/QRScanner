#!/usr/bin/env node
/**
 * Add GEMINI env vars to Golden Sand Vercel project (production/preview/dev).
 * Reads GEMINI_* from warda-shamya .env.local — does not touch doctorburger.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGaz_ROOT = resolve(ROOT, '../engaz-admin-wt');
const GOLDENSAND_PROJECT = 'prj_5UnGretJrAeJAhfn2yhnMVMcBcPV';
const TARGETS = ['production', 'preview', 'development'];
const KEYS = ['GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_IMAGE_MODEL'];

function loadEnvFile(path) {
  const env = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
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

async function vercelApi(token, method, path, body) {
  const res = await fetch(`https://api.vercel.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

async function upsertEnv(token, projectId, key, value) {
  const list = await vercelApi(token, 'GET', `/v9/projects/${projectId}/env`);
  if (!list.ok) throw new Error(`List env failed: ${JSON.stringify(list.json)}`);

  const existing = list.json.envs?.find((e) => e.key === key);
  if (existing) {
    const patch = await vercelApi(token, 'PATCH', `/v9/projects/${projectId}/env/${existing.id}`, {
      value,
      type: 'encrypted',
      target: TARGETS,
    });
    if (!patch.ok) throw new Error(`Patch ${key} failed: ${JSON.stringify(patch.json)}`);
    return 'updated';
  }

  const post = await vercelApi(token, 'POST', `/v10/projects/${projectId}/env`, {
    key,
    value,
    type: 'encrypted',
    target: TARGETS,
  });
  if (!post.ok) throw new Error(`Add ${key} failed: ${JSON.stringify(post.json)}`);
  return 'created';
}

async function main() {
  const local = loadEnvFile(resolve(ROOT, '.env.local'));
  const engaz = loadEnvFile(resolve(ENGaz_ROOT, '.env.local'));
  const token = engaz.VERCEL_TOKEN;
  if (!token) throw new Error('Missing VERCEL_TOKEN in engaz-admin-wt/.env.local');

  const geminiKey = local.GEMINI_API_KEY?.trim();
  if (!geminiKey) throw new Error('Missing GEMINI_API_KEY in warda-shamya/.env.local');

  const report = { projectId: GOLDENSAND_PROJECT, steps: [] };
  report.steps.push({
    key: 'GEMINI_API_KEY',
    action: await upsertEnv(token, GOLDENSAND_PROJECT, 'GEMINI_API_KEY', geminiKey),
  });

  for (const key of ['GEMINI_MODEL', 'GEMINI_IMAGE_MODEL']) {
    const value = local[key]?.trim();
    if (!value) continue;
    report.steps.push({
      key,
      action: await upsertEnv(token, GOLDENSAND_PROJECT, key, value),
    });
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
