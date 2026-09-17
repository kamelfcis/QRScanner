'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronDown, Printer, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/feedback/ConfirmDialog';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { OrderReceipt } from '@/components/dashboard/orders/OrderReceipt';
import { COLUMN_TONE } from '@/components/dashboard/orders/column-tone';
import { fetchStaffOrderForReceipt } from '@/hooks/useStaffOrder';
import { useDeleteOrder } from '@/hooks/useOrders';
import { salesReportKeys } from '@/hooks/useSalesReport';
import { formatLocaleDate } from '@/lib/dateLocale';
import { formatCurrencyAmount, type CurrencyLocale } from '@/lib/order/format-currency';
import { printReceiptElement, receiptDomId } from '@/lib/order/print-receipt';
import { formatDisplayPhone } from '@/lib/phone/normalize';
import { cn, getLocalizedText } from '@/lib/utils';
import type { Order, OrderWithItems, RestaurantSettings } from '@/types/database';

interface CopyFn {
  (key: string, values?: Record<string, string | number>): string;
}

interface SalesLedgerProps {
  orders: Order[];
  locale: string;
  currencyLocale: CurrencyLocale;
  settings?: RestaurantSettings | null;
  t: CopyFn;
  tOrders: CopyFn;
  tMenu: CopyFn;
  tCommon: CopyFn;
}

function money(amount: number, currency: string, locale: CurrencyLocale): string {
  return formatCurrencyAmount(amount, currency, { locale });
}

function detailQueryKey(orderId: string) {
  return [...salesReportKeys.all, 'detail', orderId] as const;
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
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        className="min-h-11 touch-manipulation"
        onClick={(event) => {
          event.stopPropagation();
          onPrint();
        }}
      >
        <Printer className="me-1.5 h-4 w-4" aria-hidden="true" />
        {reprintLabel}
      </Button>
      <Button
        type="button"
        variant="destructive"
        className="min-h-11 touch-manipulation"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="me-1.5 h-4 w-4" aria-hidden="true" />
        {deleteLabel}
      </Button>
    </div>
  );
}

export function SalesLedger({
  orders,
  locale,
  currencyLocale,
  settings,
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

  const handlePrint = async (orderId: string) => {
    try {
      const full = await queryClient.fetchQuery({
        queryKey: detailQueryKey(orderId),
        queryFn: () => fetchStaffOrderForReceipt(orderId),
        staleTime: 60_000,
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
              <th className="px-3 py-2 font-medium">
                <span className="sr-only">{tCommon('actions')}</span>
              </th>
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
                onDelete={() => setDeleting(order)}
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
              onDelete={() => setDeleting(order)}
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
        open={!!deleting}
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
  onDelete: () => void;
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
      </button>
      <div className="mt-3">
        <OrderActions
          reprintLabel={t('reprint')}
          deleteLabel={t('deleteForever')}
          onPrint={onPrint}
          onDelete={onDelete}
        />
      </div>
      {expanded ? (
        <div className="mt-3 border-t pt-3">
          <SalesOrderDetail
            orderId={order.id}
            locale={locale}
            currencyLocale={currencyLocale}
            t={t}
            tOrders={tOrders}
            tMenu={tMenu}
            tCommon={tCommon}
          />
        </div>
      ) : null}
    </article>
  );
}

function SalesOrderRows({
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
  onDelete: () => void;
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
      <tr className={cn('border-border border-b', cancelled && 'bg-destructive/10')}>
        <td className={cn('px-3 py-2', cancelled && 'border-s-destructive border-s-4')}>
          <button
            type="button"
            className="flex min-h-11 w-full touch-manipulation items-center gap-2 text-start font-semibold tabular-nums"
            aria-expanded={expanded}
            aria-label={expanded ? tOrders('collapseItems') : tOrders('expandItems')}
            onClick={onToggle}
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none',
                expanded && 'rotate-180'
              )}
              aria-hidden="true"
            />
            {order.order_number}
          </button>
        </td>
        <td className="text-muted-foreground px-3 py-2 tabular-nums">{when}</td>
        <td className="px-3 py-2">{order.customer_name}</td>
        <td className="px-3 py-2">
          <Badge
            variant={cancelled ? 'destructive' : 'outline'}
            className={cn(!cancelled && COLUMN_TONE[order.status])}
          >
            {tOrders(`status.${order.status}`)}
          </Badge>
        </td>
        <td
          className={cn(
            'px-3 py-2 text-end font-semibold tabular-nums',
            cancelled && 'text-destructive line-through'
          )}
        >
          {total}
        </td>
        <td className="px-3 py-2">
          <OrderActions
            reprintLabel={t('reprint')}
            deleteLabel={t('deleteForever')}
            onPrint={onPrint}
            onDelete={onDelete}
          />
        </td>
      </tr>
      {expanded ? (
        <tr className={cn(cancelled && 'bg-destructive/10')}>
          <td colSpan={6} className="px-3 pb-4">
            <SalesOrderDetail
              orderId={order.id}
              locale={locale}
              currencyLocale={currencyLocale}
              t={t}
              tOrders={tOrders}
              tMenu={tMenu}
              tCommon={tCommon}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function SalesOrderDetail({
  orderId,
  locale,
  currencyLocale,
  t,
  tOrders,
  tMenu,
  tCommon,
}: {
  orderId: string;
  locale: string;
  currencyLocale: CurrencyLocale;
  t: CopyFn;
  tOrders: CopyFn;
  tMenu: CopyFn;
  tCommon: CopyFn;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: detailQueryKey(orderId),
    queryFn: () => fetchStaffOrderForReceipt(orderId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{tCommon('loading')}</p>;
  }
  if (error || !data) {
    return (
      <p className="text-destructive text-sm" role="alert">
        {error instanceof Error ? error.message : tCommon('error')}
      </p>
    );
  }

  const currency = data.currency || 'EGP';
  const phone = data.customer_phone ? formatDisplayPhone(data.customer_phone) : '';

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {data.items.map((item) => {
          const name = getLocalizedText(locale, {
            en: item.name_en,
            ar: item.name_ar,
            fr: item.name_fr,
            nl: item.name_nl,
          });
          const size =
            item.size_option === 'small'
              ? tOrders('small')
              : item.size_option === 'large'
                ? tOrders('large')
                : '';
          const line = Number(item.unit_price) * item.quantity;
          return (
            <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p>
                  <span className="tabular-nums">{item.quantity}×</span> {name}
                  {size ? (
                    <span className="text-muted-foreground ms-1 text-xs">({size})</span>
                  ) : null}
                  {item.weight_grams != null ? (
                    <span className="text-muted-foreground ms-1 text-xs">
                      ({tMenu('grams', { grams: item.weight_grams })})
                    </span>
                  ) : null}
                </p>
                {item.notes ? <p className="text-muted-foreground text-xs">{item.notes}</p> : null}
              </div>
              <p className="shrink-0 tabular-nums">{money(line, currency, currencyLocale)}</p>
            </li>
          );
        })}
      </ul>
      <dl className="text-muted-foreground grid gap-1 text-xs">
        {phone ? (
          <div className="flex justify-between gap-2">
            <dt>{t('colPhone')}</dt>
            <dd className="text-foreground tabular-nums">{phone}</dd>
          </div>
        ) : null}
        {data.delivery_address ? (
          <div className="flex justify-between gap-2">
            <dt>{tOrders('delivery')}</dt>
            <dd className="text-foreground text-end">{data.delivery_address}</dd>
          </div>
        ) : null}
        {Number(data.delivery_fee) > 0 ? (
          <div className="flex justify-between gap-2">
            <dt>{tOrders('receiptDelivery')}</dt>
            <dd className="text-foreground tabular-nums">
              {money(Number(data.delivery_fee), currency, currencyLocale)}
            </dd>
          </div>
        ) : null}
        {data.coupon_code ? (
          <div className="flex justify-between gap-2">
            <dt>{t('colCoupon')}</dt>
            <dd className="text-foreground">{data.coupon_code}</dd>
          </div>
        ) : null}
        {data.notes ? (
          <div className="flex justify-between gap-2">
            <dt>{t('orderNotes')}</dt>
            <dd className="text-foreground text-end">{data.notes}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
