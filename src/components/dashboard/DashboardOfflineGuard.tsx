'use client';

import { createContext, useContext } from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { cn } from '@/lib/utils';

interface DashboardOfflineContextValue {
  offline: boolean;
  mutationsBlocked: boolean;
}

const DashboardOfflineContext = createContext<DashboardOfflineContextValue>({
  offline: false,
  mutationsBlocked: false,
});

export function useDashboardOffline(): DashboardOfflineContextValue {
  return useContext(DashboardOfflineContext);
}

export function DashboardOfflineGuard({ children }: { children: React.ReactNode }) {
  const offline = useOnlineStatus();
  const t = useTranslations('offline');

  return (
    <DashboardOfflineContext.Provider value={{ offline, mutationsBlocked: offline }}>
      {offline ? (
        <div
          role="alert"
          className={cn(
            'bg-destructive/90 text-destructive-foreground sticky top-0 z-[60] flex items-center justify-center gap-2',
            'px-4 py-2.5 text-sm backdrop-blur-sm'
          )}
        >
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t('dashboardBlocked')}</span>
        </div>
      ) : null}
      {children}
    </DashboardOfflineContext.Provider>
  );
}
