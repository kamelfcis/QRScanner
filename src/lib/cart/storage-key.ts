export const LEGACY_CART_STORAGE_KEY = 'warda-cart-v1';

export function getCartStorageKey(tenant?: string): string {
  return `warda-cart-${tenant ?? process.env.NEXT_PUBLIC_TENANT ?? 'default'}-v1`;
}

/** One-time migration from the global cart key to a tenant-scoped key. */
export function migrateLegacyCartStorage(): void {
  if (typeof window === 'undefined') return;

  const newKey = getCartStorageKey();
  if (newKey === LEGACY_CART_STORAGE_KEY) return;

  const legacy = window.localStorage.getItem(LEGACY_CART_STORAGE_KEY);
  if (!legacy || window.localStorage.getItem(newKey)) return;

  window.localStorage.setItem(newKey, legacy);
  window.localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
}
