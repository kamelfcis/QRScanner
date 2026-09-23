import type { QueryClient } from '@tanstack/react-query';
import { enqueueOutboxRow } from './db';
import { notifyOutboxChanged, type OutboxMutationType, type OutboxPayload } from './types';

export interface EnqueueOrRunOptions<T> {
  queryClient: QueryClient;
  type: OutboxMutationType;
  payload: OutboxPayload;
  clientMutationId: string;
  onlineFn: () => Promise<T>;
  optimistic: () => void;
  offlineResult?: T;
}

function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

export async function enqueueOrRun<T>(options: EnqueueOrRunOptions<T>): Promise<T> {
  const { queryClient, type, payload, clientMutationId, onlineFn, optimistic, offlineResult } =
    options;

  if (!isBrowserOffline()) {
    return onlineFn();
  }

  await enqueueOutboxRow({
    id: crypto.randomUUID(),
    type,
    payload,
    clientMutationId,
    createdAt: new Date().toISOString(),
  });

  optimistic();
  notifyOutboxChanged();
  void queryClient;

  return (offlineResult ?? undefined) as T;
}
