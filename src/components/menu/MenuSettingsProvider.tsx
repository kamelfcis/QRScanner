'use client';

import { createContext, useContext, useMemo } from 'react';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { getRestaurantCurrency } from '@/lib/order/format-currency';
import type { RestaurantSettings } from '@/types/database';

interface MenuSettingsContextValue {
  settings: RestaurantSettings | undefined;
  currency: string;
  isSettingsReady: boolean;
}

const MenuSettingsContext = createContext<MenuSettingsContextValue | null>(null);

interface MenuSettingsProviderProps {
  children: React.ReactNode;
  /** Server-prefetched restaurant settings - ensures currency on first paint. */
  initialSettings?: RestaurantSettings | null;
}

export function MenuSettingsProvider({ children, initialSettings }: MenuSettingsProviderProps) {
  const { data, isPending } = useRestaurantSettings();
  const settings = data ?? initialSettings ?? undefined;
  const isSettingsReady = Boolean(settings?.currency?.trim()) || (!isPending && Boolean(settings));

  const value = useMemo(
    () => ({
      settings,
      currency: getRestaurantCurrency(settings?.currency),
      isSettingsReady,
    }),
    [settings, isSettingsReady]
  );

  return <MenuSettingsContext.Provider value={value}>{children}</MenuSettingsContext.Provider>;
}

export function useMenuSettings(): MenuSettingsContextValue {
  const context = useContext(MenuSettingsContext);
  if (!context) {
    throw new Error('useMenuSettings must be used within MenuSettingsProvider');
  }
  return context;
}
