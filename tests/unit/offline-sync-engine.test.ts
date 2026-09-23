import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OutboxRow } from '@/lib/offline/types';

const mockGetPending = vi.fn();
const mockRemove = vi.fn();
const mockMarkFailed = vi.fn();
const mockIncrement = vi.fn();
const mockCreateClient = vi.fn();

vi.mock('@/lib/offline/db', () => ({
  getPendingOutboxRows: (...args: unknown[]) => mockGetPending(...args),
  removeOutboxRow: (...args: unknown[]) => mockRemove(...args),
  markOutboxRowFailed: (...args: unknown[]) => mockMarkFailed(...args),
  incrementOutboxAttempts: (...args: unknown[]) => mockIncrement(...args),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

function makeRow(overrides: Partial<OutboxRow>): OutboxRow {
  return {
    id: 'row-1',
    type: 'update_order_status',
    payload: { orderId: 'order-1', status: 'ready' },
    clientMutationId: 'm1',
    createdAt: '2026-01-01T10:00:00.000Z',
    attempts: 0,
    status: 'pending',
    ...overrides,
  };
}

describe('flushOutbox', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockCreateClient.mockReturnValue({
      from: () => ({
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      }),
    });
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('processes pending rows in FIFO order and removes on success', async () => {
    vi.resetModules();
    const rows = [
      makeRow({ id: 'row-1', createdAt: '2026-01-01T10:00:00.000Z' }),
      makeRow({
        id: 'row-2',
        type: 'acknowledge_order',
        payload: { orderId: 'order-2' },
        createdAt: '2026-01-01T10:01:00.000Z',
      }),
    ];
    mockGetPending.mockResolvedValue(rows);

    const { flushOutbox } = await import('@/lib/offline/sync-engine');
    const result = await flushOutbox(queryClient);

    expect(result.processed).toBe(2);
    expect(result.failed).toBe(0);
    expect(mockRemove).toHaveBeenCalledTimes(2);
    expect(mockRemove.mock.calls[0][0]).toBe('row-1');
    expect(mockRemove.mock.calls[1][0]).toBe('row-2');
  });

  it('stops drain on network errors without marking failed', async () => {
    mockGetPending.mockResolvedValue([
      makeRow({ id: 'row-1' }),
      makeRow({ id: 'row-2', payload: { orderId: 'order-2', status: 'preparing' } }),
    ]);
    mockCreateClient.mockReturnValue({
      from: () => ({
        update: () => ({
          eq: async () => {
            throw new TypeError('Failed to fetch');
          },
        }),
      }),
    });

    const { flushOutbox } = await import('@/lib/offline/sync-engine');
    const result = await flushOutbox(queryClient);

    expect(result.stopped).toBe(true);
    expect(result.processed).toBe(0);
    expect(mockMarkFailed).not.toHaveBeenCalled();
  });

  it('marks conflict rows as failed', async () => {
    mockGetPending.mockResolvedValue([makeRow({ id: 'row-1' })]);
    mockCreateClient.mockReturnValue({
      from: () => ({
        update: () => ({
          eq: async () => ({ error: { code: 'PGRST116', message: 'not found' } }),
        }),
      }),
    });

    const { flushOutbox } = await import('@/lib/offline/sync-engine');
    const result = await flushOutbox(queryClient);

    expect(result.failed).toBe(1);
    expect(mockMarkFailed).toHaveBeenCalledWith('row-1', 'order_not_found');
  });
});
