import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  asOrderStatus,
  canFetchLiveStatus,
  fetchLiveOrderStatus,
  mergeLiveStatus,
} from '@/lib/order/live-status';
import type { LastOrderSnapshot } from '@/lib/order/last-order';

const snapshot: LastOrderSnapshot = {
  orderNumber: 'AS-0042',
  phone: '201501534655',
  status: 'new',
  diningMode: 'takeaway',
  fulfillmentType: 'pickup',
  placedAt: '2026-08-22T12:00:00.000Z',
  total: 85,
  currency: 'EGP',
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('canFetchLiveStatus', () => {
  it('requires both a ticket number and at least 8 phone digits', () => {
    expect(canFetchLiveStatus('AS-0042', '201501534655')).toBe(true);
    expect(canFetchLiveStatus('AS-0042', '1501534655')).toBe(true);
    expect(canFetchLiveStatus('AS-0042', '')).toBe(false);
    expect(canFetchLiveStatus('AS-0042', null)).toBe(false);
    expect(canFetchLiveStatus('', '201501534655')).toBe(false);
    expect(canFetchLiveStatus(null, '201501534655')).toBe(false);
    expect(canFetchLiveStatus('AS-0042', '1234567')).toBe(false);
  });
});

describe('asOrderStatus', () => {
  it('keeps known kitchen statuses and falls back to new', () => {
    expect(asOrderStatus('preparing')).toBe('preparing');
    expect(asOrderStatus('pending')).toBe('new');
    expect(asOrderStatus(null)).toBe('new');
  });
});

describe('mergeLiveStatus', () => {
  it('updates status without dropping the local snapshot extras', () => {
    const merged = mergeLiveStatus(snapshot, {
      orderNumber: 'AS-0042',
      status: 'ready',
      updatedAt: '2026-08-22T12:10:00.000Z',
      diningMode: 'takeaway',
    });
    expect(merged.status).toBe('ready');
    expect(merged.phone).toBe('201501534655');
    expect(merged.total).toBe(85);
    expect(merged.placedAt).toBe(snapshot.placedAt);
  });

  it('can start a ticket from a live match plus the entered phone', () => {
    const merged = mergeLiveStatus(
      null,
      {
        orderNumber: 'AS-0042',
        status: 'preparing',
        updatedAt: '2026-08-22T12:10:00.000Z',
        diningMode: 'dining',
      },
      '201501534655'
    );
    expect(merged.orderNumber).toBe('AS-0042');
    expect(merged.phone).toBe('201501534655');
    expect(merged.diningMode).toBe('dining');
    expect(merged.placedAt).toBe('2026-08-22T12:10:00.000Z');
  });
});

describe('fetchLiveOrderStatus', () => {
  it('does not call the API without a phone', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchLiveOrderStatus('AS-0042', '')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns live fields when the API finds a match', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          found: true,
          order_number: 'AS-0042',
          status: 'preparing',
          updated_at: '2026-08-22T12:10:00.000Z',
          dining_mode: 'takeaway',
        }),
      })
    );
    await expect(fetchLiveOrderStatus('AS-0042', '201501534655')).resolves.toEqual({
      orderNumber: 'AS-0042',
      status: 'preparing',
      updatedAt: '2026-08-22T12:10:00.000Z',
      diningMode: 'takeaway',
    });
  });

  it('falls back to null when the API finds nothing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ found: false }),
      })
    );
    await expect(fetchLiveOrderStatus('AS-0042', '201501534655')).resolves.toBeNull();
  });
});
