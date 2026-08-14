'use client';

import { useLocalStorage } from './useLocalStorage';
import { useCallback } from 'react';
import type { Product } from '@/types/database';

const MAX_RECENT = 10;

export function useRecentlyViewed() {
  const [recent, setRecent] = useLocalStorage<Product[]>('harameen-recent', []);

  const addRecent = useCallback(
    (product: Product) => {
      setRecent((prev) => {
        const filtered = prev.filter((p) => p.id !== product.id);
        return [product, ...filtered].slice(0, MAX_RECENT);
      });
    },
    [setRecent]
  );

  return { recent, addRecent, clearRecent: () => setRecent([]) };
}
