'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ConfirmDialog } from '@/components/shared/feedback/ConfirmDialog';
import { useFeatureSettings, useRestaurantSettings } from '@/hooks/useSettings';
import {
  useAcknowledgeOrder,
  useDeleteOrder,
  useMarkOrderWhatsAppSent,
  useOrders,
  useRealtimeOrders,
  useUpdateOrderStatus,
} from '@/hooks/useOrders';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatCurrencyAmount, toCurrencyLocale } from '@/lib/order/format-currency';
import { buildStoredOrderWhatsApp, openWhatsAppUrl } from '@/lib/order/build-order';
import { normalizeWhatsAppPhone } from '@/lib/order/whatsapp-url';
import { resumeOrderRingAudio, startOrderRing, stopOrderRing } from '@/lib/audio/order-ring';
import { cn } from '@/lib/utils';
import type { MessageLocale } from '@/lib/order/whatsapp-message';
import type { OrderStatus, OrderWithItems } from '@/types/database';
import {
  OrdersCommandHeader,
  ordersColumnId,
} from '@/components/dashboard/orders/OrdersCommandHeader';
import { OrderTicket } from '@/components/dashboard/orders/OrderTicket';
import { OrdersCleanupDialog } from '@/components/dashboard/orders/OrdersCleanupDialog';
import { ACTIVE_COLUMNS, COLUMN_TONE } from '@/components/dashboard/orders/column-tone';

function isSameLocalDay(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isUnacknowledged(order: OrderWithItems): boolean {
  return order.status === 'new' && !order.staff_acknowledged_at;
}

export default function OrdersPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const t = useTranslations('orders');
  const tCommon = useTranslations('common');
  const prefersReducedMotion = useReducedMotion();
  const { data: features, isLoading: featuresLoading } = useFeatureSettings();
  const { data: settings } = useRestaurantSettings();
  const { data: orders, isLoading, error, refetch } = useOrders();
  const updateStatus = useUpdateOrderStatus();
  const acknowledgeOrder = useAcknowledgeOrder();
  const markWhatsApp = useMarkOrderWhatsAppSent();
  const deleteOrder = useDeleteOrder();
  useRealtimeOrders();

  const [tab, setTab] = useState<'active' | 'cancelled'>('active');
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState<OrderWithItems | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  useEffect(() => {
    if (featuresLoading) return;
    if (features?.dashboard_orders !== true) {
      router.replace('/dashboard');
    }
  }, [features, featuresLoading, router]);

  const unacknowledged = useMemo(() => (orders ?? []).filter(isUnacknowledged), [orders]);

  useEffect(() => {
    if (unacknowledged.length === 0) {
      stopOrderRing();
      return;
    }

    if (prefersReducedMotion) {
      stopOrderRing();
      return;
    }

    startOrderRing({ prefersReducedMotion });
    void resumeOrderRingAudio().then((ok) => {
      setSoundBlocked(!ok);
    });
  }, [unacknowledged.length, prefersReducedMotion]);

  useEffect(() => {
    return () => {
      stopOrderRing();
    };
  }, []);

  useEffect(() => {
    if (!orders) return;
    const incoming = orders.filter((order) => order.status === 'new');
    if (!primed.current) {
      incoming.forEach((order) => seenIds.current.add(order.id));
      primed.current = true;
      return;
    }
    const fresh = incoming.filter((order) => !seenIds.current.has(order.id));
    if (fresh.length > 0) {
      fresh.forEach((order) => seenIds.current.add(order.id));
      toast.message(t('newOrderToast', { number: fresh[0].order_number }));
    }
  }, [orders, t]);

  const visible = useMemo(() => {
    const list = orders ?? [];
    if (tab === 'cancelled') return list.filter((order) => order.status === 'cancelled');
    return list.filter((order) => order.status !== 'cancelled' && isSameLocalDay(order.created_at));
  }, [orders, tab]);

  const grouped = useMemo(() => {
    const map: Record<OrderStatus, OrderWithItems[]> = {
      new: [],
      preparing: [],
      ready: [],
      completed: [],
      cancelled: [],
    };
    for (const order of visible) map[order.status].push(order);
    return map;
  }, [visible]);

  const todayActive = useMemo(
    () =>
      (orders ?? []).filter(
        (order) => order.status !== 'cancelled' && isSameLocalDay(order.created_at)
      ),
    [orders]
  );

  const cancelledCount = useMemo(
    () => (orders ?? []).filter((order) => order.status === 'cancelled').length,
    [orders]
  );

  const pipelineCounts = useMemo(() => {
    const counts = { new: 0, preparing: 0, ready: 0, completed: 0 };
    for (const order of todayActive) {
      if (order.status === 'cancelled') continue;
      counts[order.status] += 1;
    }
    return counts;
  }, [todayActive]);

  const todayRevenue = useMemo(
    () => todayActive.reduce((sum, order) => sum + Number(order.total), 0),
    [todayActive]
  );

  const pendingColumn = useRef<OrderStatus | null>(null);

  const scrollToColumn = useCallback(
    (status: OrderStatus) => {
      const el = document.getElementById(ordersColumnId(status));
      if (!el) return;
      el.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        inline: 'start',
        block: 'nearest',
      });
      el.focus({ preventScroll: true });
    },
    [prefersReducedMotion]
  );

  const handleStatusFocus = useCallback(
    (status: OrderStatus) => {
      if (tab !== 'active') {
        pendingColumn.current = status;
        setTab('active');
        return;
      }
      scrollToColumn(status);
    },
    [tab, scrollToColumn]
  );

  useEffect(() => {
    if (tab !== 'active' || !pendingColumn.current) return;
    const status = pendingColumn.current;
    pendingColumn.current = null;
    const frame = requestAnimationFrame(() => scrollToColumn(status));
    return () => cancelAnimationFrame(frame);
  }, [tab, scrollToColumn]);

  const handleEnableSound = async () => {
    const ok = await resumeOrderRingAudio();
    if (ok) {
      setSoundBlocked(false);
      if (unacknowledged.length > 0) {
        startOrderRing({ prefersReducedMotion });
      }
    }
  };

  const handleAcknowledge = useCallback(
    async (id: string) => {
      try {
        await acknowledgeOrder.mutateAsync(id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tCommon('error'));
      }
    },
    [acknowledgeOrder, tCommon]
  );

  const handleAcknowledgeAll = async () => {
    try {
      await Promise.all(unacknowledged.map((order) => acknowledgeOrder.mutateAsync(order.id)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'));
    }
  };

  const handleStatus = async (order: OrderWithItems, status: OrderStatus) => {
    try {
      if (status === 'preparing' && isUnacknowledged(order)) {
        await acknowledgeOrder.mutateAsync(order.id);
      }
      await updateStatus.mutateAsync({ id: order.id, status });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'));
    }
  };

  const handleWhatsApp = async (order: OrderWithItems) => {
    if (!settings || !whatsappConfigured) {
      toast.error(t('whatsappMissing'));
      return;
    }
    try {
      const built = buildStoredOrderWhatsApp({
        order,
        items: order.items,
        locale: locale as MessageLocale,
        settings,
      });
      openWhatsAppUrl(built.whatsappUrl);
      if (!order.whatsapp_sent) {
        await markWhatsApp.mutateAsync(order.id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'));
    }
  };

  const handleDeleteOrder = async () => {
    if (!deletingOrder) return;
    try {
      await deleteOrder.mutateAsync(deletingOrder.id);
      toast.success(t('deleteOrderSuccess', { number: deletingOrder.order_number }));
      setDeletingOrder(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'));
    }
  };

  if (featuresLoading || (features?.dashboard_orders !== true && !featuresLoading)) {
    return <LoadingPage />;
  }
  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  const whatsappConfigured = Boolean(normalizeWhatsAppPhone(settings?.whatsapp || ''));
  const currencyLocale = toCurrencyLocale(locale);
  const currency = settings?.currency ?? todayActive[0]?.currency;
  const formattedRevenue = formatCurrencyAmount(todayRevenue, currency, { locale: currencyLocale });
  const busy =
    updateStatus.isPending ||
    markWhatsApp.isPending ||
    acknowledgeOrder.isPending ||
    deleteOrder.isPending;

  return (
    <div className="space-y-5">
      {unacknowledged.length > 0 ? (
        <div
          role="alert"
          className="sticky top-0 z-20 flex flex-col gap-3 rounded-xl border border-amber-400/80 bg-amber-50 p-4 shadow-sm dark:bg-amber-950/40"
        >
          <div className="flex items-start gap-3">
            <BellRing
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-amber-950 dark:text-amber-100">
                {t('newOrderAlert', { count: unacknowledged.length })}
              </p>
              <p className="mt-0.5 text-sm text-amber-900/80 dark:text-amber-200/80">
                {t('acknowledge')}
              </p>
            </div>
            <Button
              className="min-h-11 shrink-0"
              disabled={busy}
              onClick={() => void handleAcknowledgeAll()}
            >
              {t('acknowledgeAll')}
            </Button>
          </div>
          {soundBlocked && !prefersReducedMotion ? (
            <Button
              variant="outline"
              className="min-h-11 w-full sm:w-auto"
              onClick={() => void handleEnableSound()}
            >
              {t('enableSound')}
            </Button>
          ) : null}
        </div>
      ) : null}

      <OrdersCommandHeader
        tab={tab}
        onTabChange={setTab}
        statusCounts={pipelineCounts}
        unackedCount={unacknowledged.length}
        todayCount={todayActive.length}
        cancelledCount={cancelledCount}
        formattedRevenue={formattedRevenue}
        prefersReducedMotion={prefersReducedMotion}
        onStatusFocus={handleStatusFocus}
        onCleanup={() => setCleanupOpen(true)}
      />

      {tab === 'cancelled' ? (
        visible.length === 0 ? (
          <EmptyState title={t('emptyCancelled')} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((order) => (
              <OrderTicket
                key={order.id}
                order={order}
                locale={locale}
                currencyLocale={currencyLocale}
                settings={settings}
                t={t}
                busy={busy}
                whatsappConfigured={whatsappConfigured}
                onAcknowledge={handleAcknowledge}
                onStatus={handleStatus}
                onWhatsApp={handleWhatsApp}
                onDelete={setDeletingOrder}
              />
            ))}
          </div>
        )
      ) : (
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-4">
          {ACTIVE_COLUMNS.map((status) => (
            <section
              id={ordersColumnId(status)}
              key={status}
              tabIndex={-1}
              className="bg-muted/30 focus-visible:ring-ring min-w-[280px] snap-start scroll-mt-24 rounded-2xl border p-3 outline-none focus-visible:ring-2 md:min-w-0"
              aria-label={t(`status.${status}`)}
            >
              <div
                className={cn(
                  'mb-3 flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5',
                  COLUMN_TONE[status]
                )}
              >
                <h2 className="text-sm font-semibold">{t(`status.${status}`)}</h2>
                <span className="text-xs font-bold tabular-nums">{grouped[status].length}</span>
              </div>
              <div className="space-y-3">
                {grouped[status].length === 0 ? (
                  <p className="text-muted-foreground px-1 py-6 text-center text-sm">
                    {t('emptyColumn')}
                  </p>
                ) : (
                  grouped[status].map((order) => (
                    <OrderTicket
                      key={order.id}
                      order={order}
                      locale={locale}
                      currencyLocale={currencyLocale}
                      settings={settings}
                      t={t}
                      busy={busy}
                      whatsappConfigured={whatsappConfigured}
                      onAcknowledge={handleAcknowledge}
                      onStatus={handleStatus}
                      onWhatsApp={handleWhatsApp}
                      onDelete={setDeletingOrder}
                    />
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deletingOrder}
        onOpenChange={(open) => {
          if (!open) setDeletingOrder(null);
        }}
        title={t('deleteOrder')}
        description={
          deletingOrder
            ? `${t('deleteOrderConfirm', { number: deletingOrder.order_number })}${
                isUnacknowledged(deletingOrder) ? ` ${t('deleteOrderUnacknowledgedWarning')}` : ''
              }`
            : ''
        }
        confirmLabel={tCommon('delete')}
        cancelLabel={tCommon('cancel')}
        loadingLabel={tCommon('loading')}
        variant="destructive"
        loading={deleteOrder.isPending}
        onConfirm={() => void handleDeleteOrder()}
      />

      <OrdersCleanupDialog open={cleanupOpen} onOpenChange={setCleanupOpen} />
    </div>
  );
}
