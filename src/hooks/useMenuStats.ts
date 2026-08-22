'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAdminQueryEnabled } from './useAdminQueryEnabled';

export const menuKeys = {
  all: ['menu'] as const,
  stats: () => [...menuKeys.all, 'stats'] as const,
};

export type MenuStats = {
  totalCategories: number;
  totalProducts: number;
  totalGallery: number;
  totalOffers: number;
};

function assertNoError(label: string, error: { message: string } | null) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

export function useMenuStats() {
  const enabled = useAdminQueryEnabled();

  return useQuery({
    queryKey: menuKeys.stats(),
    enabled,
    queryFn: async () => {
      const supabase = createClient();

      const [categoriesRes, productsRes, galleryRes, offersRes] = await Promise.all([
        supabase.from('categories').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('gallery').select('*', { count: 'exact', head: true }),
        supabase.from('offers').select('*', { count: 'exact', head: true }),
      ]);

      const responses = [
        ['categories', categoriesRes],
        ['products', productsRes],
        ['gallery', galleryRes],
        ['offers', offersRes],
      ] as const;

      for (const [label, res] of responses) {
        assertNoError(label, res.error);
      }

      return {
        totalCategories: categoriesRes.count || 0,
        totalProducts: productsRes.count || 0,
        totalGallery: galleryRes.count || 0,
        totalOffers: offersRes.count || 0,
      } satisfies MenuStats;
    },
    staleTime: 15000,
  });
}
