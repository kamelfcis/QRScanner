'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getPendingOutboxCount } from '@/lib/offline/db';
import { flushOutbox } from '@/lib/offline/sync-engine';
import { OFFLINE_OUTBOX_CHANGED } from '@/lib/offline/types';
import { useOnlineStatus } from './useOnlineStatus';

export function useOfflineSync() {
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const refreshPending = useCallback(async () => {
    const count = await getPendingOutboxCount();
    setPendingCount(count);
  }, []);

  const flush = useCallback(async () => {
    if (!online) return { processed: 0, failed: 0, stopped: true, lastError: null };
    setSyncing(true);
    try {
      const result = await flushOutbox(queryClient);
      setLastError(result.lastError);
      await refreshPending();
      return result;
    } finally {
      setSyncing(false);
    }
  }, [online, queryClient, refreshPending]);

  useEffect(() => {
    const syncCount = () => {
      void getPendingOutboxCount().then(setPendingCount);
    };

    syncCount();
    window.addEventListener(OFFLINE_OUTBOX_CHANGED, syncCount);
    return () => window.removeEventListener(OFFLINE_OUTBOX_CHANGED, syncCount);
  }, []);

  useEffect(() => {
    if (!online || pendingCount === 0) return;
    const timer = window.setTimeout(() => {
      void flush();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [online, pendingCount, flush]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && online) {
        void flush();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [online, flush]);

  return {
    offline: !online,
    pendingCount,
    syncing,
    lastError,
    flush,
  };
}
