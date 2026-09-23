import Dexie, { type Table } from 'dexie';
import type { OutboxRow } from './types';

class OfflineDatabase extends Dexie {
  outbox!: Table<OutboxRow, string>;

  constructor() {
    super('warda-offline');
    this.version(1).stores({
      outbox: 'id, status, createdAt, type',
    });
  }
}

export const offlineDb = new OfflineDatabase();

export async function getPendingOutboxRows(): Promise<OutboxRow[]> {
  return offlineDb.outbox.where('status').equals('pending').sortBy('createdAt');
}

export async function getPendingOutboxCount(): Promise<number> {
  return offlineDb.outbox.where('status').equals('pending').count();
}

export async function enqueueOutboxRow(row: Omit<OutboxRow, 'attempts' | 'status'>): Promise<void> {
  await offlineDb.outbox.put({
    ...row,
    attempts: 0,
    status: 'pending',
  });
}

export async function removeOutboxRow(id: string): Promise<void> {
  await offlineDb.outbox.delete(id);
}

export async function markOutboxRowFailed(id: string, lastError: string): Promise<void> {
  await offlineDb.outbox.update(id, { status: 'failed', lastError });
}

export async function incrementOutboxAttempts(id: string): Promise<void> {
  const row = await offlineDb.outbox.get(id);
  if (!row) return;
  await offlineDb.outbox.update(id, { attempts: row.attempts + 1 });
}
