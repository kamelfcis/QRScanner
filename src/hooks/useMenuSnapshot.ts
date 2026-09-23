'use client';

import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { categoryKeys } from '@/lib/catalog/keys';
import { settingsKeys } from '@/hooks/useSettings';
import { hasOfflinePwa } from '@/i18n/config';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import type { CategoryWithProducts } from '@/types';
import type { RestaurantSettings } from '@/types';

export const menuSnapshotKeys = {
  all: ['menu-snapshot'] as const,
};

export interface MenuSnapshot {
  categories: CategoryWithProducts[];
  settings: RestaurantSettings | null;
  cachedAt: string;
}

export async function fetchMenuSnapshot(): Promise<MenuSnapshot> {
  const response = await fetch('/api/menu/snapshot');
  if (!response.ok) {
    throw new Error('Menu snapshot unavailable');
  }
  return response.json() as Promise<MenuSnapshot>;
}

/** Warm the SW snapshot cache after a successful online catalog load. */
export function useWarmMenuSnapshot(catalogReady: boolean) {
  const online = useOnlineStatus();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!hasOfflinePwa || !catalogReady || !online) return;

    void fetchMenuSnapshot()
      .then((snapshot) => {
        queryClient.setQueryData(categoryKeys.withProducts(), snapshot.categories);
        if (snapshot.settings) {
          queryClient.setQueryData(settingsKeys.restaurant(), snapshot.settings);
        }
      })
      .catch(() => {
        // Best-effort warm cache; offline fallback uses persisted RQ or SW body.
      });
  }, [catalogReady, online, queryClient]);
}

export function useOfflineMenuFallback(
  categories: CategoryWithProducts[] | undefined,
  isLoading: boolean,
  catalogError: Error | null
) {
  const online = useOnlineStatus();
  const queryClient = useQueryClient();

  const needsFallback =
    hasOfflinePwa && !online && !isLoading && Boolean(catalogError) && !categories?.length;

  const { data: snapshot } = useQuery({
    queryKey: menuSnapshotKeys.all,
    queryFn: fetchMenuSnapshot,
    enabled: needsFallback,
    retry: false,
    staleTime: Infinity,
  });

  const effectiveCategories = useMemo(() => {
    if (categories?.length) return categories;
    if (!hasOfflinePwa || online) return categories;

    const persisted = queryClient.getQueryData<CategoryWithProducts[]>(categoryKeys.withProducts());
    if (persisted?.length) return persisted;
    return snapshot?.categories;
  }, [categories, online, queryClient, snapshot?.categories]);

  const isCachedView = Boolean(
    hasOfflinePwa && !online && effectiveCategories?.length && (catalogError || !categories?.length)
  );

  return {
    categories: effectiveCategories,
    isCachedView,
  };
}
