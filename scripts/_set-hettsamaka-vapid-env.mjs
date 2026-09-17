#!/usr/bin/env node
/**
 * Set Web Push VAPID env vars on hettsamaka Vercel project only.
 * Usage: node scripts/_set-hettsamaka-vapid-env.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEAM_ID = 'team_2IFtuuXSEcZGzUhW1VNyM0JE';
const PROJECT = 'hettsamaka';

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

async function upsertEnv(projectId, token, key, value, type = 'encrypted') {
  const listRes = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/env?teamId=${TEAM_ID}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const listJson = await listRes.json();
  if (!listRes.ok) throw new Error(`List env failed: ${JSON.stringify(listJson)}`);

  const existing = (listJson.envs ?? []).find((row) => row.key === key);
  const body = {
    key,
    value,
    type,
    target: ['production', 'preview', 'development'],
  };

  if (existing?.id) {
    const patchRes = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}?teamId=${TEAM_ID}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    const patchJson = await patchRes.json();
    if (!patchRes.ok) throw new Error(`Patch ${key} failed: ${JSON.stringify(patchJson)}`);
    return 'updated';
  }

  const createRes = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/env?teamId=${TEAM_ID}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  const createJson = await createRes.json();
  if (!createRes.ok) throw new Error(`Create ${key} failed: ${JSON.stringify(createJson)}`);
  return 'created';
}

async function main() {
  const env = loadEnv(ROOT);
  const token = env.VERCEL_TOKEN;
  if (!token) throw new Error('Missing VERCEL_TOKEN in .env.local');

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY || env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || env.VAPID_SUBJECT || 'mailto:ops@hettsamaka.com';

  if (!publicKey || !privateKey) {
    throw new Error('Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in env before running');
  }

  const projectRes = await fetch(
    `https://api.vercel.com/v9/projects/${PROJECT}?teamId=${TEAM_ID}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const project = await projectRes.json();
  if (!projectRes.ok) throw new Error(`Project lookup failed: ${JSON.stringify(project)}`);

  const results = {};
  for (const [key, value, type] of [
    ['NEXT_PUBLIC_VAPID_PUBLIC_KEY', publicKey, 'plain'],
    ['VAPID_PRIVATE_KEY', privateKey, 'encrypted'],
    ['VAPID_SUBJECT', subject, 'plain'],
  ]) {
    results[key] = await upsertEnv(project.id, token, key, value, type);
  }

  console.log(JSON.stringify({ project: project.name, results, publicKey }, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
