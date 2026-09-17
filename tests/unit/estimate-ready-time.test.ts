import { describe, expect, it } from 'vitest';
import { estimateReadyTime, formatReadyTimeRange } from '@/lib/order/estimate-ready-time';

describe('estimateReadyTime', () => {
  it('stays within 20–35 minutes', () => {
    const est = estimateReadyTime({
      itemCount: 12,
      fulfillmentType: 'delivery',
      basePrepMinutes: 25,
    });
    expect(est.minMinutes).toBeGreaterThanOrEqual(20);
    expect(est.maxMinutes).toBeLessThanOrEqual(35);
    expect(est.maxMinutes).toBeGreaterThanOrEqual(est.minMinutes);
  });

  it('adds more time for delivery than pickup', () => {
    const pickup = estimateReadyTime({ itemCount: 2, fulfillmentType: 'pickup' });
    const delivery = estimateReadyTime({ itemCount: 2, fulfillmentType: 'delivery' });
    expect(delivery.minMinutes).toBeGreaterThanOrEqual(pickup.minMinutes);
  });

  it('formats a localized range', () => {
    const est = estimateReadyTime({ itemCount: 1, fulfillmentType: 'pickup' });
    expect(formatReadyTimeRange(est, 'en')).toMatch(/\d+–\d+/);
  });
});
