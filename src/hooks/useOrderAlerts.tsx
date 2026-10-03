'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useFeatureSettings } from '@/hooks/useSettings';
import { useOrders, useRealtimeOrders } from '@/hooks/useOrders';
import {
  isOrdersRingSessionUnlocked,
  persistOrdersRingUnlocked,
  resumeOrderRingAudio,
  startOrderRing,
  stopOrderRing,
} from '@/lib/audio/order-ring';
import type { OrderWithItems } from '@/types/database';

function isUnacknowledged(order: OrderWithItems): boolean {
  return order.status === 'new' && !order.staff_acknowledged_at;
}

interface OrderAlertsContextValue {
  unacknowledged: OrderWithItems[];
  soundBlocked: boolean;
  enableSound: () => Promise<void>;
  prefersReducedMotion: boolean;
}

const OrderAlertsContext = createContext<OrderAlertsContextValue | null>(null);

export function OrderAlertsProvider({
  children,
  enabled = true,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) {
  const t = useTranslations('orders');
  const tKitchen = useTranslations('kitchen');
  const prefersReducedMotion = useReducedMotion();
  const { data: features } = useFeatureSettings();
  const { data: orders } = useOrders();
  useRealtimeOrders();

  const [soundBlocked, setSoundBlocked] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());
  const primed = useRef(false);
  const alertsEnabled = enabled && features?.dashboard_orders === true;

  const unacknowledged = useMemo(
    () => (alertsEnabled ? (orders ?? []).filter(isUnacknowledged) : []),
    [orders, alertsEnabled]
  );

  useEffect(() => {
    if (!alertsEnabled || prefersReducedMotion) return;

    let unlocked = false;
    const hasUnacked = unacknowledged.length > 0;

    const unlockFromGesture = () => {
      if (unlocked) return;
      void resumeOrderRingAudio().then((ok) => {
        if (!ok) return;
        unlocked = true;
        persistOrdersRingUnlocked();
        setSoundBlocked(false);
        if (hasUnacked) {
          startOrderRing({ prefersReducedMotion: false });
        }
        window.removeEventListener('pointerdown', unlockFromGesture, true);
        window.removeEventListener('keydown', unlockFromGesture, true);
      });
    };

    window.addEventListener('pointerdown', unlockFromGesture, true);
    window.addEventListener('keydown', unlockFromGesture, true);
    return () => {
      window.removeEventListener('pointerdown', unlockFromGesture, true);
      window.removeEventListener('keydown', unlockFromGesture, true);
    };
  }, [alertsEnabled, prefersReducedMotion, unacknowledged.length]);

  useEffect(() => {
    if (!alertsEnabled) return;

    if (unacknowledged.length === 0 || prefersReducedMotion) {
      stopOrderRing();
      return;
    }

    startOrderRing({ prefersReducedMotion });

    if (isOrdersRingSessionUnlocked()) {
      void resumeOrderRingAudio().then((ok) => {
        setSoundBlocked(!ok);
        if (ok) startOrderRing({ prefersReducedMotion });
      });
      return;
    }

    void resumeOrderRingAudio().then((ok) => {
      setSoundBlocked(!ok);
    });
  }, [alertsEnabled, unacknowledged.length, prefersReducedMotion]);

  useEffect(() => {
    if (!alertsEnabled) return;
    return () => {
      stopOrderRing();
    };
  }, [alertsEnabled]);

  useEffect(() => {
    if (!alertsEnabled || !orders) return;
    const incoming = orders.filter((order) => order.status === 'new');
    if (!primed.current) {
      incoming.forEach((order) => seenIds.current.add(order.id));
      primed.current = true;
      return;
    }
    const fresh = incoming.filter((order) => !seenIds.current.has(order.id));
    if (fresh.length === 0) return;

    fresh.forEach((order) => seenIds.current.add(order.id));
    const first = fresh[0];
    toast.message(t('newOrderToast', { number: first.order_number }), {
      id: `new-order-${first.id}`,
      description: tKitchen('openKitchenBoard'),
      action: {
        label: tKitchen('viewKitchen'),
        onClick: () => {
          window.location.assign('/kitchen');
        },
      },
    });
  }, [orders, alertsEnabled, t, tKitchen]);

  const enableSound = async () => {
    const ok = await resumeOrderRingAudio();
    if (ok) {
      persistOrdersRingUnlocked();
      setSoundBlocked(false);
      if (unacknowledged.length > 0) {
        startOrderRing({ prefersReducedMotion });
      }
    }
  };

  const value = useMemo(
    () => ({
      unacknowledged,
      soundBlocked,
      enableSound,
      prefersReducedMotion,
    }),
    [unacknowledged, soundBlocked, prefersReducedMotion]
  );

  return <OrderAlertsContext.Provider value={value}>{children}</OrderAlertsContext.Provider>;
}

export function useOrderAlerts() {
  const context = useContext(OrderAlertsContext);
  if (!context) {
    throw new Error('useOrderAlerts must be used within OrderAlertsProvider');
  }
  return context;
}
