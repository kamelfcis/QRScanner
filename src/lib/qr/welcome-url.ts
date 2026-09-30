import { buildMenuEntryUrl, getMenuEntryPath, isEcommerceStore } from '@/lib/store-config';

/** Build the customer-facing URL embedded in table QR codes. */
export function buildWelcomeUrl(siteUrl: string, tableNumber?: number | null): string {
  const base = siteUrl.replace(/\/$/, '');
  const table = tableNumber != null ? String(tableNumber) : null;

  if (isEcommerceStore || getMenuEntryPath() !== '/welcome') {
    return `${base}${buildMenuEntryUrl(table)}`;
  }

  const params = new URLSearchParams();
  if (table) params.set('table', table);
  const qs = params.toString();
  return qs ? `${base}/welcome?${qs}` : `${base}/welcome`;
}
