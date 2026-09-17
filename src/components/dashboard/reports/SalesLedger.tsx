'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ChevronDown,
  MapPin,
  MessageSquare,
  Phone,
  Printer,
  ShoppingBag,
  Tag,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/feedback/ConfirmDialog';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { OrderReceipt } from '@/components/dashboard/orders/OrderReceipt';
import { ItemThumb, MAX_ITEM_THUMBS } from '@/components/dashboard/orders/ItemThumb';
import { COLUMN_TONE } from '@/components/dashboard/orders/column-tone';
import { fetchStaffOrderForReceipt } from '@/hooks/useStaffOrder';
import { useDeleteOrder } from '@/hooks/useOrders';
import { salesReportKeys } from '@/hooks/useSalesReport';
import { formatLocaleDate } from '@/lib/dateLocale';
import { formatCurrencyAmount, type CurrencyLocale } from '@/lib/order/format-currency';
import { printReceiptElement, receiptDomId } from '@/lib/order/print-receipt';
import { formatDisplayPhone } from '@/lib/phone/normalize';
import { cn, getLocalizedText } from '@/lib/utils';
import type { Order, OrderItem, OrderWithItems, RestaurantSettings } from '@/types/database';

interface CopyFn {
  (key: string, values?: Record<string, string | number>): string;
}

interface SalesLedgerProps {
  orders: Order[];
  locale: string;
  currencyLocale: CurrencyLocale;
  settings?: RestaurantSettings | null;
  allowDelete?: boolean;
  t: CopyFn;
  tOrders: CopyFn;
  tMenu: CopyFn;
  tCommon: CopyFn;
}

const DETAIL_STALE_MS = 60_000;

function money(amount: number, currency: string, locale: CurrencyLocale): string {
  return formatCurrencyAmount(amount, currency, { locale });
}

function detailQueryKey(orderId: string) {
  return [...salesReportKeys.all, 'detail', orderId] as const;
}

function localizedItemName(locale: string, item: OrderItem): string {
  return getLocalizedText(locale, {
    en: item.name_en,
    ar: item.name_ar,
    fr: item.name_fr,
    nl: item.name_nl,
  });
}

function totalItemCount(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

function OrderActions({
  reprintLabel,
  deleteLabel,
  onPrint,
  onDelete,
}: {
  reprintLabel: string;
  deleteLabel: string;
  onPrint: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 border-t pt-3">
      <Button
        type="button"
        variant="outline"
        className="min-h-11 flex-1 touch-manipulation sm:flex-none"
        onClick={(event) => {
          event.stopPropagation();
          onPrint();
        }}
      >
        <Printer className="me-1.5 h-4 w-4" aria-hidden="true" />
        {reprintLabel}
      </Button>
      {onDelete ? (
        <Button
          type="button"
          variant="destructive"
          className="min-h-11 flex-1 touch-manipulation sm:flex-none"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="me-1.5 h-4 w-4" aria-hidden="true" />
          {deleteLabel}
        </Button>
      ) : null}
    </div>
  );
}

function CollapsedThumbPreview({
  orderId,
  locale,
  expanded,
  tOrders,
}: {
  orderId: string;
  locale: string;
  expanded: boolean;
  tOrders: CopyFn;
}) {
  const queryClient = useQueryClient();
  if (expanded) return null;

  const cached = queryClient.getQueryData<OrderWithItems>(detailQueryKey(orderId));
  if (!cached?.items.length) return null;

  const thumbs = cached.items.slice(0, MAX_ITEM_THUMBS);
  const leftover = cached.items.length - MAX_ITEM_THUMBS;
  const itemCount = totalItemCount(cached.items);

  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      <div className="flex items-center">
        {thumbs.map((item, index) => (
          <ItemThumb
            key={item.id}
            imageUrl={item.image_url}
            alt={localizedItemName(locale, item)}
            size="sm"
            className={cn('ring-background ring-2', index > 0 && '-ms-3')}
          />
        ))}
        {leftover > 0 ? (
          <span className="bg-muted text-muted-foreground ring-background ms-1 inline-flex size-11 shrink-0 items-center justify-center rounded-lg border text-xs font-medium ring-2">
            +{leftover}
          </span>
        ) : null}
      </div>
      <p className="text-muted-foreground shrink-0 text-xs tabular-nums">
        {tOrders('itemCount', { count: itemCount })}
      </p>
    </div>
  );
}

function SalesOrderDetailSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label={label}>
      <Skeleton className="h-10 w-full rounded-lg" />
      <ul className="space-y-2.5">
        {[1, 2, 3].map((row) => (
          <li key={row} className="flex items-start gap-2.5">
            <Skeleton className="size-12 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-[80%]" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-4 w-14 shrink-0" />
          </li>
        ))}
      </ul>
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}

function SalesOrderDetail({
  orderId,
  cancelled,
  locale,
  currencyLocale,
  t,
  tOrders,
  tMenu,
  tCommon,
  onPrint,
  onDelete,
}: {
  orderId: string;
  cancelled: boolean;
  locale: string;
  currencyLocale: CurrencyLocale;
  t: CopyFn;
  tOrders: CopyFn;
  tMenu: CopyFn;
  tCommon: CopyFn;
  onPrint: () => void;
  onDelete?: () => void;
}) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: detailQueryKey(orderId),
    queryFn: () => fetchStaffOrderForReceipt(orderId),
    staleTime: DETAIL_STALE_MS,
  });

  if (isLoading) {
    return <SalesOrderDetailSkeleton label={tCommon('loading')} />;
  }

  if (error || !data) {
    return (
      <div
        role="alert"
        className="border-destructive/40 bg-destructive/10 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <p className="text-destructive text-sm">
          {error instanceof Error ? error.message : t('retryLoad')}
        </p>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 shrink-0 touch-manipulation"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          {t('retryLoad')}
        </Button>
      </div>
    );
  }

  const currency = data.currency || 'EGP';
  const phone = data.customer_phone ? formatDisplayPhone(data.customer_phone) : '';
  const when = formatLocaleDate(data.created_at, 'dd/MM/yyyy HH:mm', locale);
  const diningLabel = data.dining_mode === 'dining' ? tOrders('dining') : tOrders('takeaway');
  const fulfillmentLabel =
    data.fulfillment_type === 'delivery'
      ? tOrders('delivery')
      : data.fulfillment_type === 'pickup'
        ? tOrders('pickup')
        : null;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border',
        cancelled ? 'border-destructive/30 bg-destructive/5' : 'border-border/80 bg-muted/20'
      )}
    >
      <header className="border-border/60 bg-background/80 flex flex-col gap-2 border-b px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {t('detailTitle')}
          </p>
          <time dateTime={data.created_at} className="text-muted-foreground text-xs tabular-nums">
            {when}
          </time>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {fulfillmentLabel ? (
            <Badge variant="outline" className="gap-1 font-normal">
              {data.fulfillment_type === 'delivery' ? (
                <MapPin className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ShoppingBag className="h-3 w-3" aria-hidden="true" />
              )}
              {fulfillmentLabel}
            </Badge>
          ) : null}
          <Badge variant="outline" className="gap-1 font-normal">
            {data.dining_mode === 'dining' ? (
              <UtensilsCrossed className="h-3 w-3" aria-hidden="true" />
            ) : (
              <ShoppingBag className="h-3 w-3" aria-hidden="true" />
            )}
            {diningLabel}
          </Badge>
          {data.table_number ? (
            <Badge variant="outline" className="font-normal">
              {tOrders('table')} {data.table_number}
            </Badge>
          ) : null}
          {phone ? (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span dir="ltr" className="unicode-bidi-plaintext tabular-nums">
                {phone}
              </span>
            </span>
          ) : null}
        </div>
      </header>

      <div className="space-y-3 px-3 py-3 sm:px-4">
        <ul className="space-y-2.5">
          {data.items.map((item) => {
            const name = localizedItemName(locale, item);
            const size =
              item.size_option === 'small'
                ? tOrders('small')
                : item.size_option === 'large'
                  ? tOrders('large')
                  : null;
            const lineTotal = Number(item.unit_price) * item.quantity;
            return (
              <li
                key={item.id}
                className={cn('flex items-start gap-2.5 text-sm', cancelled && 'opacity-80')}
              >
                <ItemThumb imageUrl={item.image_url} alt={name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className={cn('leading-snug', cancelled && 'line-through')}>
                    <span className="tabular-nums">{item.quantity}×</span> {name}
                  </p>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {size ? (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
                        {size}
                      </Badge>
                    ) : null}
                    {item.weight_grams != null ? (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
                        {tMenu('grams', { grams: item.weight_grams })}
                      </Badge>
                    ) : null}
                  </div>
                  {item.notes ? (
                    <p className="text-muted-foreground mt-1 text-xs">{item.notes}</p>
                  ) : null}
                </div>
                <div className="shrink-0 text-end">
                  <p
                    className={cn(
                      'font-medium tabular-nums',
                      cancelled && 'text-destructive line-through'
                    )}
                  >
                    <span className="sr-only">{t('lineTotal')}: </span>
                    {money(lineTotal, currency, currencyLocale)}
                  </p>
                  <p className="text-muted-foreground text-[11px] tabular-nums">
                    {money(Number(item.unit_price), currency, currencyLocale)} × {item.quantity}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        {(data.delivery_address || data.notes || data.coupon_code) && (
          <div className="space-y-2 border-t pt-3">
            {data.delivery_address ? (
              <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{data.delivery_address}</span>
              </p>
            ) : null}
            {data.notes ? (
              <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
                <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{data.notes}</span>
              </p>
            ) : null}
            {data.coupon_code ? (
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Tag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {t('colCoupon')}:{' '}
                  <span className="text-foreground font-medium">{data.coupon_code}</span>
                </span>
              </p>
            ) : null}
          </div>
        )}

        <div
          className={cn(
            'bg-background/90 space-y-1.5 rounded-lg border px-3 py-2.5',
            cancelled && 'border-destructive/20'
          )}
        >
          <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
            {t('orderSummary')}
          </p>
          <div className="flex justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{tOrders('receiptSubtotal')}</span>
            <span className={cn('tabular-nums', cancelled && 'line-through')}>
              {money(Number(data.subtotal), currency, currencyLocale)}
            </span>
          </div>
          {Number(data.delivery_fee) > 0 ? (
            <div className="flex justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{tOrders('receiptDelivery')}</span>
              <span className={cn('tabular-nums', cancelled && 'line-through')}>
                {money(Number(data.delivery_fee), currency, currencyLocale)}
              </span>
            </div>
          ) : null}
          {Number(data.discount_amount) > 0 ? (
            <div className="flex justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                {data.coupon_code
                  ? tOrders('receiptDiscountCode', { code: data.coupon_code })
                  : tOrders('receiptDiscount')}
              </span>
              <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
                −{money(Number(data.discount_amount), currency, currencyLocale)}
              </span>
            </div>
          ) : null}
          {Number(data.tax) > 0 ? (
            <div className="flex justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{tOrders('receiptTax')}</span>
              <span className="tabular-nums">
                {money(Number(data.tax), currency, currencyLocale)}
              </span>
            </div>
          ) : null}
          {Number(data.service) > 0 ? (
            <div className="flex justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{tOrders('receiptService')}</span>
              <span className="tabular-nums">
                {money(Number(data.service), currency, currencyLocale)}
              </span>
            </div>
          ) : null}
          <div className="border-border/60 flex justify-between gap-2 border-t pt-2">
            <span className="font-heading font-semibold">{tOrders('receiptTotal')}</span>
            <span
              className={cn(
                'font-heading text-base font-semibold tabular-nums',
                cancelled && 'text-destructive line-through'
              )}
            >
              {money(Number(data.total), currency, currencyLocale)}
            </span>
          </div>
        </div>

        <OrderActions
          reprintLabel={t('reprint')}
          deleteLabel={t('deleteForever')}
          onPrint={onPrint}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

function ExpandableDetail({ expanded, children }: { expanded: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-200 motion-reduce:transition-none',
        expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

export function SalesLedger({
  orders,
  locale,
  currencyLocale,
  settings,
  allowDelete = true,
  t,
  tOrders,
  tMenu,
  tCommon,
}: SalesLedgerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Order | null>(null);
  const [printOrder, setPrintOrder] = useState<OrderWithItems | null>(null);
  const deleteOrder = useDeleteOrder();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!printOrder) return;
    const el = document.getElementById(receiptDomId(printOrder.id));
    if (!el) return;
    void printReceiptElement(el)
      .catch(() => toast.error(tOrders('printFailed')))
      .finally(() => setPrintOrder(null));
  }, [printOrder, tOrders]);

  const prefetchDetail = (orderId: string) => {
    void queryClient.prefetchQuery({
      queryKey: detailQueryKey(orderId),
      queryFn: () => fetchStaffOrderForReceipt(orderId),
      staleTime: DETAIL_STALE_MS,
    });
  };

  const handlePrint = async (orderId: string) => {
    try {
      const full = await queryClient.fetchQuery({
        queryKey: detailQueryKey(orderId),
        queryFn: () => fetchStaffOrderForReceipt(orderId),
        staleTime: DETAIL_STALE_MS,
      });
      setPrintOrder(full);
    } catch {
      toast.error(tOrders('printFailed'));
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteOrder.mutateAsync(deleting.id);
      toast.success(tOrders('deleteOrderSuccess', { number: deleting.order_number }));
      setDeleting(null);
      if (expandedId === deleting.id) setExpandedId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'));
    }
  };

  if (orders.length === 0) {
    return <EmptyState title={t('emptySales')} />;
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-border text-muted-foreground border-b text-start text-xs uppercase tracking-wide">
              <th className="px-3 py-2 font-medium">{t('colOrderNumber')}</th>
              <th className="px-3 py-2 font-medium">{t('colDate')}</th>
              <th className="px-3 py-2 font-medium">{t('colCustomer')}</th>
              <th className="px-3 py-2 font-medium">{t('colStatus')}</th>
              <th className="px-3 py-2 text-end font-medium">{t('colTotal')}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <SalesOrderRows
                key={order.id}
                order={order}
                expanded={expandedId === order.id}
                onToggle={() => setExpandedId((id) => (id === order.id ? null : order.id))}
                onPrint={() => void handlePrint(order.id)}
                onDelete={allowDelete ? () => setDeleting(order) : undefined}
                onPrefetch={() => prefetchDetail(order.id)}
                locale={locale}
                currencyLocale={currencyLocale}
                t={t}
                tOrders={tOrders}
                tMenu={tMenu}
                tCommon={tCommon}
              />
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-2 md:hidden">
        {orders.map((order) => (
          <li key={order.id}>
            <SalesOrderCard
              order={order}
              expanded={expandedId === order.id}
              onToggle={() => setExpandedId((id) => (id === order.id ? null : order.id))}
              onPrint={() => void handlePrint(order.id)}
              onDelete={allowDelete ? () => setDeleting(order) : undefined}
              locale={locale}
              currencyLocale={currencyLocale}
              t={t}
              tOrders={tOrders}
              tMenu={tMenu}
              tCommon={tCommon}
            />
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={allowDelete && !!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t('deleteForever')}
        description={deleting ? t('deleteForeverConfirm', { number: deleting.order_number }) : ''}
        confirmLabel={t('deleteForever')}
        cancelLabel={tCommon('cancel')}
        loadingLabel={tCommon('loading')}
        variant="destructive"
        loading={deleteOrder.isPending}
        onConfirm={() => void handleDelete()}
      />

      {printOrder ? (
        <div className="pointer-events-none fixed start-[-9999px] top-0" aria-hidden="true">
          <OrderReceipt
            order={printOrder}
            settings={settings}
            locale={locale}
            currencyLocale={currencyLocale}
            t={tOrders}
          />
        </div>
      ) : null}
    </>
  );
}

function SalesOrderCard({
  order,
  expanded,
  onToggle,
  onPrint,
  onDelete,
  locale,
  currencyLocale,
  t,
  tOrders,
  tMenu,
  tCommon,
}: {
  order: Order;
  expanded: boolean;
  onToggle: () => void;
  onPrint: () => void;
  onDelete?: () => void;
  locale: string;
  currencyLocale: CurrencyLocale;
  t: CopyFn;
  tOrders: CopyFn;
  tMenu: CopyFn;
  tCommon: CopyFn;
}) {
  const cancelled = order.status === 'cancelled';
  const total = money(Number(order.total), order.currency || 'EGP', currencyLocale);
  const when = formatLocaleDate(order.created_at, 'dd/MM/yyyy HH:mm', locale);

  return (
    <article
      className={cn(
        'rounded-xl border p-3',
        cancelled
          ? 'border-destructive/40 bg-destructive/10 border-s-destructive border-s-4'
          : 'border-border bg-card'
      )}
    >
      <button
        type="button"
        className="flex min-h-11 w-full touch-manipulation flex-col gap-2 text-start"
        aria-expanded={expanded}
        aria-label={expanded ? tOrders('collapseItems') : tOrders('expandItems')}
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-heading text-base font-semibold tabular-nums">
              {order.order_number}
            </p>
            <time
              dateTime={order.created_at}
              className="text-muted-foreground text-xs tabular-nums"
            >
              {when}
            </time>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge
              variant={cancelled ? 'destructive' : 'outline'}
              className={cn(!cancelled && COLUMN_TONE[order.status])}
            >
              {tOrders(`status.${order.status}`)}
            </Badge>
            <ChevronDown
              className={cn(
                'text-muted-foreground h-4 w-4 transition-transform motion-reduce:transition-none',
                expanded && 'rotate-180'
              )}
              aria-hidden="true"
            />
          </div>
        </div>
        <div className="flex items-end justify-between gap-2">
          <p className="truncate text-sm">{order.customer_name}</p>
          <p
            className={cn(
              'font-heading shrink-0 text-base font-semibold tabular-nums',
              cancelled && 'text-destructive line-through'
            )}
          >
            {total}
          </p>
        </div>
        <CollapsedThumbPreview
          orderId={order.id}
          locale={locale}
          expanded={expanded}
          tOrders={tOrders}
        />
      </button>
      <ExpandableDetail expanded={expanded}>
        <div className="mt-3 border-t pt-3">
          <SalesOrderDetail
            orderId={order.id}
            cancelled={cancelled}
            locale={locale}
            currencyLocale={currencyLocale}
            t={t}
            tOrders={tOrders}
            tMenu={tMenu}
            tCommon={tCommon}
            onPrint={onPrint}
            onDelete={onDelete}
          />
        </div>
      </ExpandableDetail>
    </article>
  );
}

function SalesOrderRows({
  order,
  expanded,
  onToggle,
  onPrint,
  onDelete,
  onPrefetch,
  locale,
  currencyLocale,
  t,
  tOrders,
  tMenu,
  tCommon,
}: {
  order: Order;
  expanded: boolean;
  onToggle: () => void;
  onPrint: () => void;
  onDelete?: () => void;
  onPrefetch: () => void;
  locale: string;
  currencyLocale: CurrencyLocale;
  t: CopyFn;
  tOrders: CopyFn;
  tMenu: CopyFn;
  tCommon: CopyFn;
}) {
  const cancelled = order.status === 'cancelled';
  const total = money(Number(order.total), order.currency || 'EGP', currencyLocale);
  const when = formatLocaleDate(order.created_at, 'dd/MM/yyyy HH:mm', locale);

  return (
    <>
      <tr
        className={cn('border-border border-b', cancelled && 'bg-destructive/10')}
        onMouseEnter={onPrefetch}
      >
        <td className={cn('px-3 py-2 align-top', cancelled && 'border-s-destructive border-s-4')}>
          <button
            type="button"
            className="flex min-h-11 w-full touch-manipulation flex-col gap-1 text-start"
            aria-expanded={expanded}
            aria-label={expanded ? tOrders('collapseItems') : tOrders('expandItems')}
            onClick={onToggle}
          >
            <span className="flex items-center gap-2 font-semibold tabular-nums">
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none',
                  expanded && 'rotate-180'
                )}
                aria-hidden="true"
              />
              {order.order_number}
            </span>
            <CollapsedThumbPreview
              orderId={order.id}
              locale={locale}
              expanded={expanded}
              tOrders={tOrders}
            />
          </button>
        </td>
        <td className="text-muted-foreground px-3 py-2 align-top tabular-nums">{when}</td>
        <td className="px-3 py-2 align-top">{order.customer_name}</td>
        <td className="px-3 py-2 align-top">
          <Badge
            variant={cancelled ? 'destructive' : 'outline'}
            className={cn(!cancelled && COLUMN_TONE[order.status])}
          >
            {tOrders(`status.${order.status}`)}
          </Badge>
        </td>
        <td
          className={cn(
            'px-3 py-2 text-end align-top font-semibold tabular-nums',
            cancelled && 'text-destructive line-through'
          )}
        >
          {total}
        </td>
      </tr>
      <tr className={cn(cancelled && 'bg-destructive/10')}>
        <td colSpan={5} className="px-3 pb-4 pt-0">
          <ExpandableDetail expanded={expanded}>
            <SalesOrderDetail
              orderId={order.id}
              cancelled={cancelled}
              locale={locale}
              currencyLocale={currencyLocale}
              t={t}
              tOrders={tOrders}
              tMenu={tMenu}
              tCommon={tCommon}
              onPrint={onPrint}
              onDelete={onDelete}
            />
          </ExpandableDetail>
        </td>
      </tr>
    </>
  );
}
