'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { KitchenTicket } from '@/components/dashboard/orders/KitchenTicket';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { useFeatureSettings, useRestaurantSettings } from '@/hooks/useSettings';
import { useOrders, useRealtimeOrders } from '@/hooks/useOrders';
import { fetchStaffOrderForReceipt, staffOrderReceiptKeys } from '@/hooks/useStaffOrder';
import { hasHettSamakaTier1 } from '@/i18n/config';
import { kitchenDomId, printReceiptElement } from '@/lib/order/print-receipt';
import type { OrderWithItems } from '@/types/database';

const printedIds = new Set<string>();

export function AutoKitchenPrint() {
  const queryClient = useQueryClient();
  const { locale } = useI18n();
  const tOrders = useTranslations('orders');
  const { data: features } = useFeatureSettings();
  const { data: settings } = useRestaurantSettings();
  useRealtimeOrders();
  const { data: orders } = useOrders();

  const [printOrder, setPrintOrder] = useState<OrderWithItems | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const primed = useRef(false);
  const printingRef = useRef(false);

  const enabled =
    hasHettSamakaTier1 &&
    features?.dashboard_orders === true &&
    settings?.auto_print_kitchen_ticket === true;

  useEffect(() => {
    if (!enabled || !orders) return;

    const incoming = orders.filter(
      (order) => order.status === 'new' && !order.staff_acknowledged_at
    );
    if (!primed.current) {
      incoming.forEach((order) => seenIds.current.add(order.id));
      primed.current = true;
      return;
    }

    const fresh = incoming.filter((order) => !seenIds.current.has(order.id));
    if (fresh.length === 0) return;

    fresh.forEach((order) => seenIds.current.add(order.id));

    const next = fresh.find((order) => !printedIds.has(order.id));
    if (!next || printingRef.current) return;

    printingRef.current = true;
    printedIds.add(next.id);

    void queryClient
      .fetchQuery({
        queryKey: staffOrderReceiptKeys.detail(next.id),
        queryFn: () => fetchStaffOrderForReceipt(next.id),
        staleTime: 60_000,
      })
      .then((full) => {
        setPrintOrder(full);
      })
      .catch(() => {
        printedIds.delete(next.id);
        printingRef.current = false;
      });
  }, [enabled, orders, queryClient]);

  useEffect(() => {
    if (!printOrder) return;

    const orderId = printOrder.id;
    let cancelled = false;

    const runPrint = () => {
      if (cancelled) return;
      const node = document.getElementById(kitchenDomId(orderId));
      if (!node) {
        printingRef.current = false;
        setPrintOrder(null);
        return;
      }

      void printReceiptElement(node)
        .catch(() => {
          printedIds.delete(orderId);
        })
        .finally(() => {
          printingRef.current = false;
          setPrintOrder(null);
        });
    };

    requestAnimationFrame(() => requestAnimationFrame(runPrint));
    return () => {
      cancelled = true;
    };
  }, [printOrder]);

  if (!enabled || !printOrder) return null;

  return (
    <div className="pointer-events-none fixed start-[-2000px] top-0" aria-hidden="true">
      <KitchenTicket order={printOrder} locale={locale} t={tOrders} />
    </div>
  );
}
