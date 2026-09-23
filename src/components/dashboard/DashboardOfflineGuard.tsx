'use client';

import { createContext, useContext } from 'react';
import { Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardOfflineContextValue {
  offline: boolean;
  /** True for destructive/financial ops only (shift close, delete). */
  mutationsBlocked: boolean;
  pendingCount: number;
  syncing: boolean;
  flush: () => Promise<unknown>;
}

const DashboardOfflineContext = createContext<DashboardOfflineContextValue>({
  offline: false,
  mutationsBlocked: false,
  pendingCount: 0,
  syncing: false,
  flush: async () => undefined,
});

export function useDashboardOffline(): DashboardOfflineContextValue {
  return useContext(DashboardOfflineContext);
}

export function DashboardOfflineGuard({ children }: { children: React.ReactNode }) {
  const { offline, pendingCount, syncing, flush } = useOfflineSync();
  const t = useTranslations('offline');

  const showBanner = offline || pendingCount > 0 || syncing;

  const bannerMessage = syncing
    ? t('syncing')
    : offline && pendingCount > 0
      ? t('pendingSync', { count: pendingCount })
      : offline
        ? t('dashboardWorkingOffline')
        : pendingCount > 0
          ? t('pendingSync', { count: pendingCount })
          : null;

  return (
    <DashboardOfflineContext.Provider
      value={{
        offline,
        mutationsBlocked: offline,
        pendingCount,
        syncing,
        flush,
      }}
    >
      {showBanner && bannerMessage ? (
        <div
          role="alert"
          className={cn(
            'sticky top-0 z-[60] flex items-center justify-center gap-2 px-4 py-2.5 text-sm backdrop-blur-sm',
            offline ? 'bg-amber-600/95 text-white' : 'bg-primary/90 text-primary-foreground'
          )}
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
          ) : (
            <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>{bannerMessage}</span>
          {!offline && pendingCount > 0 && !syncing ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="ms-2 h-7 px-2 text-xs"
              onClick={() => void flush()}
            >
              <RefreshCw className="me-1 h-3 w-3" aria-hidden="true" />
              {t('syncNow')}
            </Button>
          ) : null}
        </div>
      ) : null}
      {children}
    </DashboardOfflineContext.Provider>
  );
}
