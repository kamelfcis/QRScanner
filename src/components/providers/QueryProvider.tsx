'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CATALOG_STALE_TIME } from '@/lib/catalog/keys';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: CATALOG_STALE_TIME, // 5 min — better for public catalog CWV
            gcTime: 30 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
            refetchOnReconnect: 'always',
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
