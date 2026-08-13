import { randomBytes } from 'node:crypto';

export const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

export function shortSuffix(bytes = 2): string {
  return randomBytes(bytes).toString('hex');
}

export function slugFromBusinessName(name: string, suffix = shortSuffix()): string {
  const ascii = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const base = (ascii || 'venue').slice(0, 48).replace(/-+$/g, '') || 'venue';
  let slug = `${base}-${suffix}`.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  slug = slug.slice(0, 63).replace(/-+$/g, '');
  if (slug.length < 2 || !SLUG_RE.test(slug)) {
    slug = `venue-${suffix}`.slice(0, 63);
  }
  return slug;
}
