'use client';

import { useEffect, useState } from 'react';
import { normalizeOrderQuery } from '@/lib/order/last-order';
import {
  LIVE_STATUS_POLL_MS,
  canFetchLiveStatus,
  fetchLiveOrderStatus,
  type LiveOrderStatus,
} from '@/lib/order/live-status';

export function useLiveOrderStatus(
  orderNumber: string | null | undefined,
  phone: string | null | undefined,
  phoneCountry?: string,
  onLive?: (live: LiveOrderStatus) => void
): LiveOrderStatus | null {
  const [live, setLive] = useState<LiveOrderStatus | null>(null);
  const enabled = canFetchLiveStatus(orderNumber, phone);
  const matchesCurrent =
    Boolean(live) &&
    Boolean(orderNumber) &&
    normalizeOrderQuery(live?.orderNumber) === normalizeOrderQuery(orderNumber);

  useEffect(() => {
    if (!enabled || !orderNumber || !phone) return;

    let cancelled = false;

    const pull = async () => {
      const next = await fetchLiveOrderStatus(orderNumber, phone, phoneCountry);
      if (cancelled || !next) return;
      setLive(next);
      onLive?.(next);
    };

    void pull();

    const onFocus = () => {
      void pull();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void pull();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    const timer = window.setInterval(pull, LIVE_STATUS_POLL_MS);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(timer);
    };
  }, [enabled, onLive, orderNumber, phone, phoneCountry]);

  return enabled && matchesCurrent ? live : null;
}
