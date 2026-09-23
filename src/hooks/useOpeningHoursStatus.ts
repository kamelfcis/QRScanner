'use client';

import { useMemo } from 'react';
import { useHoursSettings, useRestaurantSettings } from '@/hooks/useSettings';
import { hasDailyOps } from '@/i18n/config';
import {
  getNextOpenInfo,
  isCustomerOrderingPaused,
  isWithinOpeningHours,
} from '@/lib/order/opening-hours';

export function useOpeningHoursStatus(now: Date = new Date()) {
  const { data: settings } = useRestaurantSettings();
  const { data: hours } = useHoursSettings();

  return useMemo(() => {
    if (!hasDailyOps) {
      return {
        enabled: false,
        paused: settings?.accepting_orders === false,
        outsideHours: false,
        nextOpen: null,
      };
    }

    const manualPause = settings?.accepting_orders === false;
    const withinHours = isWithinOpeningHours(hours, now);
    const outsideHours = !withinHours;
    const paused = isCustomerOrderingPaused(settings?.accepting_orders, hours, now);
    const nextOpen = outsideHours && !manualPause ? getNextOpenInfo(hours, now) : null;

    return {
      enabled: true,
      paused,
      manualPause,
      outsideHours,
      withinHours,
      nextOpen,
    };
  }, [settings?.accepting_orders, hours, now]);
}
