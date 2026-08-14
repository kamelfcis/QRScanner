'use client';

import { useSyncExternalStore } from 'react';
import { useCartStore } from '@/stores/cart-store';

const getCount = () => useCartStore.getState().items.reduce((n, i) => n + i.quantity, 0);

/**
 * Cart quantity that stays 0 until the persisted store has rehydrated,
 * so server and first client render always agree.
 */
export function useCartCount(): number {
  return useSyncExternalStore(useCartStore.subscribe, getCount, () => 0);
}
