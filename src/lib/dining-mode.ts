import type { CartDiningMode } from '@/stores/cart-store';

/** URL query values accepted for order type */
export type DiningModeParam = 'dining' | 'dine_in' | 'takeaway';

const STORAGE_KEY = 'warda-dining-mode';

/** Parse `mode` query param (supports legacy `dining` and spec `dine_in`). */
export function parseDiningModeParam(param: string | null): CartDiningMode | null {
  if (param === 'dining' || param === 'dine_in') return 'dining';
  if (param === 'takeaway') return 'takeaway';
  return null;
}

/** Serialize internal mode for menu URLs (`dine_in` for dine-in per QR flow spec). */
export function toDiningModeParam(mode: CartDiningMode): DiningModeParam {
  return mode === 'dining' ? 'dine_in' : 'takeaway';
}

export function readStoredDiningMode(): CartDiningMode {
  if (typeof window === 'undefined') return 'dining';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'dining' || saved === 'takeaway') return saved;
  return 'dining';
}

export function persistDiningMode(mode: CartDiningMode): void {
  localStorage.setItem(STORAGE_KEY, mode);
}

export function buildMenuUrl(mode: CartDiningMode, table?: string | null): string {
  const params = new URLSearchParams({ mode: toDiningModeParam(mode) });
  if (table) params.set('table', table);
  return `/menu?${params.toString()}`;
}
