import { describe, expect, it } from 'vitest';
import {
  getDayKey,
  getNextOpenInfo,
  isWithinOpeningHours,
  isCustomerOrderingPaused,
} from '@/lib/order/opening-hours';
import type { HoursSettings } from '@/types/database';

const weekdayHours: HoursSettings = {
  monday: { open: '09:00', close: '22:00', closed: false },
  tuesday: { open: '09:00', close: '22:00', closed: false },
  wednesday: { open: '09:00', close: '22:00', closed: false },
  thursday: { open: '09:00', close: '22:00', closed: false },
  friday: { open: '09:00', close: '22:00', closed: false },
  saturday: { open: '10:00', close: '23:00', closed: false },
  sunday: { closed: true },
};

describe('opening-hours', () => {
  it('maps JS weekday to day key', () => {
    expect(getDayKey(new Date('2026-09-17T12:00:00'))).toBe('thursday');
  });

  it('returns true inside configured window', () => {
    expect(isWithinOpeningHours(weekdayHours, new Date('2026-09-17T15:00:00'))).toBe(true);
  });

  it('returns false on closed days', () => {
    expect(isWithinOpeningHours(weekdayHours, new Date('2026-09-20T15:00:00'))).toBe(false);
  });

  it('returns true when hours are empty', () => {
    expect(isWithinOpeningHours({}, new Date('2026-09-17T03:00:00'))).toBe(true);
  });

  it('finds next open time after close', () => {
    const next = getNextOpenInfo(weekdayHours, new Date('2026-09-17T23:30:00'));
    expect(next?.dayKey).toBe('friday');
    expect(next?.time).toBe('09:00');
  });

  it('combines manual pause with hours', () => {
    expect(isCustomerOrderingPaused(false, weekdayHours, new Date('2026-09-17T23:30:00'))).toBe(
      true
    );
    expect(isCustomerOrderingPaused(false, weekdayHours, new Date('2026-09-17T15:00:00'))).toBe(
      false
    );
    expect(isCustomerOrderingPaused(true, weekdayHours, new Date('2026-09-17T15:00:00'))).toBe(
      true
    );
  });
});
