const DEFAULT_PREFIX = 'ORD';

export function normalizeOrderPrefix(prefix?: string | null): string {
  const cleaned = (prefix ?? DEFAULT_PREFIX).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return cleaned.slice(0, 8) || DEFAULT_PREFIX;
}

export function formatOrderNumber(seq: number, prefix?: string | null): string {
  const n = Number.isFinite(seq) ? Math.max(1, Math.floor(seq)) : 1;
  return `${normalizeOrderPrefix(prefix)}-${String(n).padStart(4, '0')}`;
}
