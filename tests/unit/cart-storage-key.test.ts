import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCartStorageKey,
  LEGACY_CART_STORAGE_KEY,
  migrateLegacyCartStorage,
} from '@/lib/cart/storage-key';

describe('getCartStorageKey', () => {
  it('scopes cart key to tenant', () => {
    expect(getCartStorageKey('hettsamaka')).toBe('warda-cart-hettsamaka-v1');
    expect(getCartStorageKey('ala-keefak')).toBe('warda-cart-ala-keefak-v1');
  });

  it('falls back to default tenant slug', () => {
    expect(getCartStorageKey()).toBe('warda-cart-default-v1');
  });
});

describe('migrateLegacyCartStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it('copies warda-cart-v1 into tenant key and removes legacy key', () => {
    vi.stubEnv('NEXT_PUBLIC_TENANT', 'hettsamaka');
    const payload = JSON.stringify({ state: { items: [{ id: 'p1' }] }, version: 0 });
    localStorage.setItem(LEGACY_CART_STORAGE_KEY, payload);

    migrateLegacyCartStorage();

    expect(localStorage.getItem('warda-cart-hettsamaka-v1')).toBe(payload);
    expect(localStorage.getItem(LEGACY_CART_STORAGE_KEY)).toBeNull();
  });

  it('does not overwrite an existing tenant-scoped cart', () => {
    vi.stubEnv('NEXT_PUBLIC_TENANT', 'hettsamaka');
    localStorage.setItem(LEGACY_CART_STORAGE_KEY, JSON.stringify({ state: { items: [] } }));
    localStorage.setItem(
      'warda-cart-hettsamaka-v1',
      JSON.stringify({ state: { items: [{ id: 'x' }] } })
    );

    migrateLegacyCartStorage();

    expect(JSON.parse(localStorage.getItem('warda-cart-hettsamaka-v1')!).state.items).toEqual([
      { id: 'x' },
    ]);
  });
});
