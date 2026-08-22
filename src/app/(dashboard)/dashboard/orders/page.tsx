'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  BellRing,
  Download,
  MessageCircle,
  Phone,
  Printer,
  MapPin,
  UtensilsCrossed,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { formatLocaleDate } from '@/lib/dateLocale';
import { formatCurrencyAmount, toCurrencyLocale } from '@/lib/order/format-currency';
import { buildStoredOrderWhatsApp, openWhatsAppUrl } from '@/lib/order/build-order';
import { normalizeWhatsAppPhone } from '@/lib/order/whatsapp-url';
import { resumeOrderRingAudio, startOrderRing, stopOrderRing } from '@/lib/audio/order-ring';
import { buildCustomerWhatsAppUrl, formatDisplayPhone } from '@/lib/phone/normalize';
import { downloadReceiptPdf, printReceiptElement, receiptDomId } from '@/lib/order/print-receipt';
import { cn, getLocalizedText } from '@/lib/utils';
import type { MessageLocale } from '@/lib/order/whatsapp-message';
import type { OrderStatus, OrderWithItems, RestaurantSettings } from '@/types/database';
import {
  OrdersCommandHeader,
  ordersColumnId,
} from '@/components/dashboard/orders/OrdersCommandHeader';
import { OrderReceipt } from '@/components/dashboard/orders/OrderReceipt';
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

function OrderTicket({
  order,
  locale,
  currencyLocale,
  settings,
  t,
  busy,
  whatsappConfigured,
  onAcknowledge,
  onStatus,
  onWhatsApp,
  onDelete,
}: {
  order: OrderWithItems;
  locale: string;
  currencyLocale: 'en' | 'ar' | 'fr' | 'nl';
  settings?: RestaurantSettings | null;
  t: (key: string, values?: Record<string, string | number>) => string;
  busy: boolean;
  whatsappConfigured: boolean;
  onAcknowledge: (id: string) => void;
  onStatus: (order: OrderWithItems, status: OrderStatus) => void;
  onWhatsApp: (order: OrderWithItems) => void;
  onDelete: (order: OrderWithItems) => void;
}) {
  const [receiptBusy, setReceiptBusy] = useState(false);
  const nextStatus: OrderStatus | null =
    order.status === 'new'
      ? 'preparing'
      : order.status === 'preparing'
        ? 'ready'
        : order.status === 'ready'
          ? 'completed'
          : null;

  const needsAck = isUnacknowledged(order);
  const customerWaUrl = order.customer_phone ? buildCustomerWhatsAppUrl(order.customer_phone) : '';
  const displayPhone = order.customer_phone ? formatDisplayPhone(order.customer_phone) : '';

  const runReceiptAction = async (mode: 'print' | 'pdf') => {
    const node = document.getElementById(receiptDomId(order.id));
    if (!node) {
      toast.error(mode === 'print' ? t('printFailed') : t('downloadFailed'));
      return;
    }
    setReceiptBusy(true);
    try {
      if (mode === 'print') {
        await printReceiptElement(node);
      } else {
        await downloadReceiptPdf(node, order.order_number);
      }
    } catch {
      toast.error(mode === 'print' ? t('printFailed') : t('downloadFailed'));
    } finally {
      setReceiptBusy(false);
    }
  };

  return (
    <article
      className={cn(
        'bg-background rounded-xl border p-3 shadow-sm',
        needsAck && 'border-amber-400 ring-2 ring-amber-400/40'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-heading text-lg font-semibold tabular-nums">{order.order_number}</p>
          <p className="text-muted-foreground text-xs">
            {formatLocaleDate(order.created_at, 'HH:mm', locale)}
          </p>
        </div>
        <Badge className={cn('border', COLUMN_TONE[order.status])}>
          {t(`status.${order.status}`)}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="bg-muted inline-flex items-center gap-1 rounded-full px-2 py-1">
          {order.dining_mode === 'dining' ? (
            <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {order.dining_mode === 'dining' ? t('dining') : t('takeaway')}
        </span>
        {order.table_number ? (
          <span className="bg-muted rounded-full px-2 py-1">
            {t('table')} {order.table_number}
          </span>
        ) : null}
        {order.fulfillment_type ? (
          <span className="bg-muted rounded-full px-2 py-1">
            {order.fulfillment_type === 'delivery' ? t('delivery') : t('pickup')}
          </span>
        ) : null}
      </div>

      <ul className="mt-3 space-y-1.5 text-sm">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-2">
            <span className="min-w-0">
              <span className="tabular-nums">{item.quantity}×</span>{' '}
              {getLocalizedText(locale, {
                en: item.name_en,
                ar: item.name_ar,
                fr: item.name_fr,
                nl: item.name_nl,
              })}
              {item.size_option ? (
                <span className="text-muted-foreground ms-1 text-xs">
                  ({item.size_option === 'small' ? t('small') : t('large')})
                </span>
              ) : null}
              {item.notes ? (
                <span className="text-muted-foreground block text-xs">{item.notes}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      {order.notes ? <p className="text-muted-foreground mt-2 text-xs">{order.notes}</p> : null}

      {order.delivery_address ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {order.delivery_address}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
        <div>
          <p className="text-sm font-medium">{order.customer_name}</p>
          {order.customer_phone ? (
            customerWaUrl ? (
              <a
                href={customerWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline"
              >
                <Phone className="h-3 w-3" aria-hidden="true" />
                {displayPhone}
              </a>
            ) : (
              <p className="text-muted-foreground flex items-center gap-1 text-xs">
                <Phone className="h-3 w-3" aria-hidden="true" />
                {displayPhone}
              </p>
            )
          ) : null}
        </div>
        <p className="font-heading text-base font-semibold tabular-nums">
          {formatCurrencyAmount(Number(order.total), order.currency, { locale: currencyLocale })}
        </p>
      </div>
      {Number(order.discount_amount) > 0 ? (
        <p className="text-muted-foreground mt-1 text-end text-xs tabular-nums">
          {order.coupon_code ? `${order.coupon_code} · ` : ''}−
          {formatCurrencyAmount(Number(order.discount_amount), order.currency, {
            locale: currencyLocale,
          })}
        </p>
      ) : null}

      <div className="mt-3 grid gap-2">
        {needsAck ? (
          <Button
            className="min-h-11 bg-amber-600 text-white hover:bg-amber-700"
            disabled={busy}
            onClick={() => onAcknowledge(order.id)}
          >
            {t('acknowledge')}
          </Button>
        ) : null}
        {nextStatus ? (
          <Button className="min-h-11" disabled={busy} onClick={() => onStatus(order, nextStatus)}>
            {t(`action.${nextStatus}`)}
          </Button>
        ) : null}
        {order.status !== 'cancelled' && order.status !== 'completed' ? (
          <Button
            variant="outline"
            className="min-h-11"
            disabled={busy}
            onClick={() => onStatus(order, 'cancelled')}
          >
            {t('action.cancelled')}
          </Button>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 whitespace-normal"
            disabled={busy || receiptBusy}
            aria-label={t('printReceipt')}
            onClick={() => void runReceiptAction('print')}
          >
            <Printer className="me-2 h-4 w-4" aria-hidden="true" />
            {t('printReceipt')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 whitespace-normal"
            disabled={busy || receiptBusy}
            aria-label={t('downloadReceipt')}
            onClick={() => void runReceiptAction('pdf')}
          >
            <Download className="me-2 h-4 w-4" aria-hidden="true" />
            {t('downloadReceipt')}
          </Button>
        </div>
        <Button
          variant="secondary"
          className="min-h-11"
          disabled={busy || !whatsappConfigured}
          onClick={() => onWhatsApp(order)}
        >
          <MessageCircle className="me-2 h-4 w-4" aria-hidden="true" />
          {order.whatsapp_sent ? t('sendWhatsAppAgain') : t('sendWhatsApp')}
        </Button>
        <Button
          variant="destructive"
          className="min-h-11"
          disabled={busy}
          onClick={() => onDelete(order)}
        >
          <Trash2 className="me-2 h-4 w-4" aria-hidden="true" />
          {t('deleteOrder')}
        </Button>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-0"
        style={{ left: -2000, width: '80mm' }}
      >
        <OrderReceipt
          order={order}
          settings={settings}
          locale={locale}
          currencyLocale={currencyLocale}
          t={t}
        />
      </div>
    </article>
  );
}
