'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { hasHettSamakaTier1 } from '@/i18n/config';
import { useTopSellingProductIds } from '@/hooks/useTopSellingProducts';

const TopSellingContext = createContext<readonly string[]>([]);

export function TopSellingProvider({ children }: { children: ReactNode }) {
  const { topProductIds } = useTopSellingProductIds();

  const value = useMemo(() => (hasHettSamakaTier1 ? topProductIds : []), [topProductIds]);

  return <TopSellingContext.Provider value={value}>{children}</TopSellingContext.Provider>;
}

export function useTopSellingBadgeIds(): readonly string[] {
  return useContext(TopSellingContext);
}
