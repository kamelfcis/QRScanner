import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatPrepTimeEta, resolvePrepTimeDisplay } from '@/lib/order/prep-time';

describe('resolvePrepTimeDisplay', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('uses days for ecommerce stores', async () => {
    vi.stubEnv('NEXT_PUBLIC_STORE_MODE', 'ecommerce');
    const { resolvePrepTimeDisplay: resolve } = await import('@/lib/order/prep-time');
    expect(resolve({ prep_time_days: 3, prep_time_minutes: 25 })).toEqual({
      value: 3,
      unit: 'days',
    });
    expect(resolve({ prep_time_days: 0, prep_time_minutes: 25 })).toBeNull();
  });

  it('uses minutes for restaurant stores', async () => {
    vi.stubEnv('NEXT_PUBLIC_STORE_MODE', 'restaurant');
    const { resolvePrepTimeDisplay: resolve } = await import('@/lib/order/prep-time');
    expect(resolve({ prep_time_days: 3, prep_time_minutes: 25 })).toEqual({
      value: 25,
      unit: 'minutes',
    });
  });
});

describe('formatPrepTimeEta', () => {
  it('formats days and minutes via labels', () => {
    expect(
      formatPrepTimeEta(
        { value: 2, unit: 'days' },
        { days: (n) => `${n}d`, minutes: (n) => `${n}m` }
      )
    ).toBe('2d');
    expect(
      formatPrepTimeEta(
        { value: 20, unit: 'minutes' },
        { days: (n) => `${n}d`, minutes: (n) => `${n}m` }
      )
    ).toBe('20m');
  });
});
