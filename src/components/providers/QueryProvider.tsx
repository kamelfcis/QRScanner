'use client';

import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  PersistQueryClientProvider,
  persistQueryClientSave,
  type Persister,
} from '@tanstack/react-query-persist-client';
import { get, set, del } from 'idb-keyval';
import { CATALOG_STALE_TIME, categoryKeys } from '@/lib/catalog/keys';
import { orderKeys } from '@/lib/order/query-keys';
import { settingsKeys } from '@/hooks/useSettings';
import { hasOfflinePwa } from '@/i18n/config';

const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000;

function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  const catalogKey = categoryKeys.withProducts();
  const settingsKey = settingsKeys.restaurant();
  const ordersListKey = orderKeys.lists();

  const matchesCatalog =
    queryKey.length === catalogKey.length &&
    catalogKey.every((part, index) => queryKey[index] === part);
  const matchesSettings =
    queryKey.length === settingsKey.length &&
    settingsKey.every((part, index) => queryKey[index] === part);
  const matchesOrders =
    queryKey.length === ordersListKey.length &&
    ordersListKey.every((part, index) => queryKey[index] === part);

  return matchesCatalog || matchesSettings || matchesOrders;
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: CATALOG_STALE_TIME,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
        refetchOnReconnect: 'always',
      },
    },
  });
}

const OFFLINE_RQ_CACHE_KEY = 'warda-rq-offline-v1';

const offlinePersister: Persister = {
  persistClient: async (client) => {
    await set(OFFLINE_RQ_CACHE_KEY, client);
  },
  restoreClient: async () => {
    const cached = await get(OFFLINE_RQ_CACHE_KEY);
    return cached ?? undefined;
  },
  removeClient: async () => {
    await del(OFFLINE_RQ_CACHE_KEY);
  },
};

function OfflineQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  useEffect(() => {
    const saveOnHide = () => {
      if (document.visibilityState !== 'hidden') return;
      void persistQueryClientSave({
        queryClient,
        persister: offlinePersister,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => shouldPersistQuery(query.queryKey),
        },
      });
    };

    document.addEventListener('visibilitychange', saveOnHide);
    return () => document.removeEventListener('visibilitychange', saveOnHide);
  }, [queryClient]);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: offlinePersister,
        maxAge: PERSIST_MAX_AGE,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => shouldPersistQuery(query.queryKey),
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

function StandardQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  if (hasOfflinePwa) {
    return <OfflineQueryProvider>{children}</OfflineQueryProvider>;
  }
  return <StandardQueryProvider>{children}</StandardQueryProvider>;
}
