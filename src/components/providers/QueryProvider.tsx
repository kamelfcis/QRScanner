'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CATALOG_STALE_TIME } from '@/lib/catalog/keys';
import { isAlaKeefakTenant } from '@/i18n/config';

const DASHBOARD_STALE_TIME = 60 * 1000;

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: isAlaKeefakTenant ? DASHBOARD_STALE_TIME : CATALOG_STALE_TIME,
            gcTime: 30 * 60 * 1000,
            refetchOnWindowFocus: isAlaKeefakTenant,
            retry: 1,
            refetchOnReconnect: 'always',
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
