#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(ROOT, '.env.local');
const token = existsSync(envPath)
  ? readFileSync(envPath, 'utf8').match(/^VERCEL_TOKEN=(.+)$/m)?.[1]?.trim()
  : null;
if (!token) throw new Error('no VERCEL_TOKEN');

const team = 'team_2IFtuuXSEcZGzUhW1VNyM0JE';
const res = await fetch(`https://api.vercel.com/v9/projects/harameen?teamId=${team}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const p = await res.json();
console.log(JSON.stringify({ productionBranch: p.link?.productionBranch, name: p.name, id: p.id }, null, 2));
