'use client';

import { useLocalStorage } from './useLocalStorage';
import { useCallback } from 'react';
import type { Product } from '@/types/database';

export function useFavorites() {
  const [favorites, setFavorites, clearFavorites] = useLocalStorage<Product[]>('warda-favorites', []);

  const toggleFavorite = useCallback((product: Product) => {
    setFavorites((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) return prev.filter((p) => p.id !== product.id);
      return [...prev, product];
    });
  }, [setFavorites]);

  const isFavorite = useCallback((productId: string) => {
    return favorites.some((p) => p.id === productId);
  }, [favorites]);

  return { favorites, toggleFavorite, isFavorite, clearFavorites, count: favorites.length };
}
