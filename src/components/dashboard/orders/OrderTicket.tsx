'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  ChevronDown,
  Download,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  Printer,
  MapPin,
  UtensilsCrossed,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { ItemThumb, MAX_ITEM_THUMBS } from '@/components/dashboard/orders/ItemThumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useSetOrderDeliveryFee } from '@/hooks/useOrders';
import { formatLocaleDate } from '@/lib/dateLocale';
import { formatCurrencyAmount } from '@/lib/order/format-currency';
import { buildCustomerWhatsAppUrl, formatDisplayPhone } from '@/lib/phone/normalize';
import { downloadReceiptPdf, printReceiptElement, receiptDomId } from '@/lib/order/print-receipt';
import { cn, getLocalizedText } from '@/lib/utils';
import type { OrderStatus, OrderWithItems, RestaurantSettings } from '@/types/database';
import { OrderReceipt } from '@/components/dashboard/orders/OrderReceipt';
import { KitchenPrintButton } from '@/components/dashboard/orders/KitchenPrintButton';
import { PaymentClosePanel } from '@/components/dashboard/orders/PaymentClosePanel';
import { VoidReasonDialog } from '@/components/dashboard/orders/VoidReasonDialog';
import { OrderAddItemsDialog } from '@/components/dashboard/orders/OrderAddItemsDialog';
import { hasDailyOps } from '@/i18n/config';
import { useUpdateOrderItemQuantity } from '@/hooks/useOrderEdit';
import { useVoidOrder, useVoidOrderItem } from '@/hooks/useOrderPayment';
import { COLUMN_TONE, NEXT_STATUS_ACTION_TONE } from '@/components/dashboard/orders/column-tone';

function isUnacknowledged(order: OrderWithItems): boolean {
  return order.status === 'new' && !order.staff_acknowledged_at;
}

function formatFeeDraft(value: number | null | undefined): string {
  const amount = Number(value ?? 0);
  return amount > 0 ? String(amount) : '';
}

function parseDeliveryFee(value: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(Math.min(99999.99, Math.max(0, amount)) * 100) / 100;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

function DeliveryFeeField({
  orderId,
  deliveryFee,
  busy,
  t,
}: {
  orderId: string;
  deliveryFee: number | null | undefined;
  busy: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const [feeDraft, setFeeDraft] = useState(() => formatFeeDraft(deliveryFee));
  const setDeliveryFee = useSetOrderDeliveryFee();

  return (
    <div className="grid gap-2">
      <label htmlFor={`delivery-fee-${orderId}`} className="text-sm font-medium">
        {t('deliveryFee')}
      </label>
      <div className="flex items-stretch gap-2">
        <Input
          id={`delivery-fee-${orderId}`}
          type="number"
          inputMode="decimal"
          min={0}
          max={99999.99}
          step="0.01"
          dir="ltr"
          className="min-h-11"
          value={feeDraft}
          disabled={busy || setDeliveryFee.isPending}
          aria-label={t('deliveryFee')}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setFeeDraft(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          className="min-h-11 shrink-0 px-4"
          disabled={busy || setDeliveryFee.isPending}
          onClick={(e) => {
            e.stopPropagation();
            const nextFee = parseDeliveryFee(feeDraft);
            setDeliveryFee.mutate(
              { id: orderId, delivery_fee: nextFee },
              {
                onError: () => {
                  toast.error(t('saveDeliveryFeeFailed'));
                },
              }
            );
          }}
        >
          {t('saveDeliveryFee')}
        </Button>
      </div>
    </div>
  );
}

function totalItemCount(items: OrderWithItems['items']): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function OrderTicket({
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
  onDelete?: (order: OrderWithItems) => void;
}) {
  const needsAck = isUnacknowledged(order);
  const voidOrder = useVoidOrder();
  const voidOrderItem = useVoidOrderItem();
  const updateQty = useUpdateOrderItemQuantity();
  const [expanded, setExpanded] = useState(needsAck || order.status === 'new');
  const [flipped, setFlipped] = useState(false);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [voidOrderOpen, setVoidOrderOpen] = useState(false);
  const [voidItemId, setVoidItemId] = useState<string | null>(null);
  const [addItemsOpen, setAddItemsOpen] = useState(false);
  const [receiptScale, setReceiptScale] = useState(1);
  const [receiptWellHeight, setReceiptWellHeight] = useState<number>();
  const flipBackRef = useRef<HTMLButtonElement>(null);
  const frontPrintRef = useRef<HTMLButtonElement>(null);
  const wellRef = useRef<HTMLDivElement>(null);
  const hadFlipped = useRef(false);

  const nextStatus: OrderStatus | null =
    order.status === 'new'
      ? 'preparing'
      : order.status === 'preparing'
        ? 'ready'
        : order.status === 'ready'
          ? 'completed'
          : null;

  const customerWaUrl = order.customer_phone ? buildCustomerWhatsAppUrl(order.customer_phone) : '';
  const displayPhone = order.customer_phone ? formatDisplayPhone(order.customer_phone) : '';
  const itemCount = totalItemCount(order.items);
  const thumbs = order.items.slice(0, MAX_ITEM_THUMBS);
  const leftover = order.items.length - MAX_ITEM_THUMBS;
  const formattedTotal = formatCurrencyAmount(Number(order.total), order.currency, {
    locale: currencyLocale,
  });

  const needsRegisterPayment =
    hasDailyOps && !order.paid_at && order.status !== 'cancelled' && order.status !== 'completed';

  const canEditOrder =
    hasDailyOps && !order.paid_at && order.status !== 'cancelled' && order.status !== 'completed';

  const unflip = () => setFlipped(false);

  const handleEditError = (err: unknown) => {
    const message = err instanceof Error ? err.message : '';
    const known = [
      'already_paid',
      'order_closed',
      'shift_closed',
      'invalid_quantity',
      'already_voided',
    ] as const;
    const code = known.find((item) => message.includes(item));
    toast.error(code ? t(`editError.${code}`) : t('editError.generic'));
  };

  const handleQtyChange = (itemId: string, nextQty: number) => {
    if (nextQty < 1 || nextQty > 99) return;
    updateQty.mutate(
      { itemId, quantity: nextQty },
      {
        onSuccess: () => toast.success(t('editQtySuccess')),
        onError: handleEditError,
      }
    );
  };

  const handleVoidError = (err: unknown) => {
    const message = err instanceof Error ? err.message : '';
    const known = ['reason_required', 'shift_closed', 'already_voided'] as const;
    const code = known.find((item) => message.includes(item));
    toast.error(code ? t(`voidError.${code}`) : t('voidError.generic'));
  };

  const flipToReceipt = () => {
    setExpanded(true);
    setFlipped(true);
  };

  useEffect(() => {
    if (flipped) {
      hadFlipped.current = true;
      flipBackRef.current?.focus();
      return;
    }
    if (hadFlipped.current) {
      frontPrintRef.current?.focus();
    }
  }, [flipped]);

  useEffect(() => {
    if (!flipped) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setFlipped(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [flipped]);

  useLayoutEffect(() => {
    if (!flipped) return;
    const well = wellRef.current;
    if (!well) return;

    const measure = () => {
      const slip = document.getElementById(receiptDomId(order.id));
      if (!slip) return;
      const nextScale = Math.min(1, well.clientWidth / (slip.scrollWidth || 1));
      setReceiptScale(nextScale);
      setReceiptWellHeight(slip.scrollHeight * nextScale);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(well);
    const slip = document.getElementById(receiptDomId(order.id));
    if (slip) observer.observe(slip);
    return () => observer.disconnect();
  }, [flipped, order.id, order.items.length, order.delivery_fee, order.total]);

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

  const localizedName = (item: OrderWithItems['items'][number]) =>
    getLocalizedText(locale, {
      en: item.name_en,
      ar: item.name_ar,
      fr: item.name_fr,
      nl: item.name_nl,
    });

  return (
    <div className="perspective-[1000px] w-full min-w-0">
      <div
        className={cn(
          'transform-3d relative w-full min-w-0 transition-transform duration-500 ease-out motion-reduce:transition-none',
          flipped && 'rotate-y-180 motion-reduce:rotate-y-0 rtl:-rotate-y-180'
        )}
      >
        <article
          className={cn(
            'bg-background backface-hidden rounded-xl border shadow-sm transition-colors duration-200 motion-reduce:transition-none',
            flipped
              ? 'pointer-events-none absolute inset-x-0 top-0 motion-reduce:hidden'
              : 'relative',
            needsAck && 'border-amber-400 ring-2 ring-amber-400/40'
          )}
          aria-hidden={flipped}
          inert={flipped}
        >
          <button
            type="button"
            className={cn(
              'hover:bg-muted/40 flex min-h-11 w-full flex-col gap-2 rounded-t-xl p-3 text-start transition-colors duration-200 motion-reduce:transition-none',
              !expanded && !needsAck && !nextStatus && 'rounded-b-xl'
            )}
            aria-expanded={expanded}
            aria-label={expanded ? t('collapseItems') : t('expandItems')}
            onClick={() => setExpanded((v) => !v)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p
                  className={cn(
                    'font-heading text-lg font-semibold tabular-nums',
                    hasDailyOps && 'text-[#1C1917] dark:text-stone-100'
                  )}
                >
                  {order.order_number}
                </p>
                <time dateTime={order.created_at} className="text-muted-foreground block text-xs">
                  <span className="block">
                    {t('orderDate')}: {formatLocaleDate(order.created_at, 'd MMMM yyyy', locale)}
                  </span>
                  <span className="block tabular-nums">
                    {t('orderTime')}: {formatLocaleDate(order.created_at, 'HH:mm', locale)}
                  </span>
                </time>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Badge className={cn('border', COLUMN_TONE[order.status])}>
                  {t(`status.${order.status}`)}
                </Badge>
                <ChevronDown
                  className={cn(
                    'text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none',
                    expanded && 'rotate-180'
                  )}
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
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
                <span className="text-muted-foreground truncate">
                  {firstName(order.customer_name)}
                </span>
              </div>
              <p className="font-heading shrink-0 text-base font-semibold tabular-nums">
                {formattedTotal}
              </p>
            </div>

            {!expanded ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center">
                  {thumbs.map((item, index) => (
                    <ItemThumb
                      key={item.id}
                      imageUrl={item.image_url}
                      alt={localizedName(item)}
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
                  {t('itemCount', { count: itemCount })}
                </p>
              </div>
            ) : null}
          </button>

          {needsAck || nextStatus ? (
            <div
              className="grid gap-2 border-t px-3 py-3"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {needsAck ? (
                <Button
                  className={cn(
                    'min-h-12 w-full text-base font-semibold',
                    hasDailyOps && 'bg-[#D97706] text-white hover:bg-amber-700'
                  )}
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAcknowledge(order.id);
                  }}
                >
                  {t('acknowledge')}
                </Button>
              ) : null}
              {needsRegisterPayment ? (
                <PaymentClosePanel
                  order={order}
                  currencyLocale={currencyLocale}
                  busy={busy}
                  t={t}
                />
              ) : null}
              {nextStatus ? (
                <Button
                  className={cn(
                    'min-h-12 w-full text-base font-semibold',
                    hasDailyOps &&
                      (NEXT_STATUS_ACTION_TONE[nextStatus] ?? 'bg-primary text-primary-foreground')
                  )}
                  disabled={busy || (hasDailyOps && nextStatus === 'completed' && !order.paid_at)}
                  title={
                    hasDailyOps && nextStatus === 'completed' && !order.paid_at
                      ? t('paymentRequiredBeforeComplete')
                      : undefined
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasDailyOps && nextStatus === 'completed' && !order.paid_at) {
                      toast.error(t('paymentRequiredBeforeComplete'));
                      return;
                    }
                    onStatus(order, nextStatus);
                  }}
                >
                  {t(`action.${nextStatus}`)}
                </Button>
              ) : null}
            </div>
          ) : null}

          <div
            className={cn(
              'grid transition-[grid-template-rows,opacity] duration-200 motion-reduce:transition-none',
              expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            )}
          >
            <div className="overflow-hidden">
              <div className="space-y-3 border-t px-3 pb-3 pt-3">
                <ul className="space-y-2 text-sm">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-start gap-2.5">
                      <ItemThumb imageUrl={item.image_url} alt={localizedName(item)} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className={cn(item.voided_at && 'text-muted-foreground line-through')}>
                          <span className="tabular-nums">{item.quantity}×</span>{' '}
                          {localizedName(item)}
                          {item.size_option ? (
                            <span className="text-muted-foreground ms-1 text-xs">
                              ({item.size_option === 'small' ? t('small') : t('large')})
                            </span>
                          ) : item.weight_grams != null ? (
                            <span className="text-muted-foreground ms-1 text-xs">
                              ({item.weight_grams}g)
                            </span>
                          ) : null}
                        </p>
                        {item.void_reason ? (
                          <p className="text-destructive text-xs">{item.void_reason}</p>
                        ) : null}
                        {item.notes ? (
                          <p className="text-muted-foreground text-xs">{item.notes}</p>
                        ) : null}
                      </div>
                      {canEditOrder && !item.voided_at ? (
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <div className="flex items-center gap-0.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              disabled={busy || updateQty.isPending || item.quantity <= 1}
                              aria-label={t('editDecreaseQty')}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQtyChange(item.id, item.quantity - 1);
                              }}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="min-w-6 text-center text-xs tabular-nums">
                              {item.quantity}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              disabled={busy || updateQty.isPending || item.quantity >= 99}
                              aria-label={t('editIncreaseQty')}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQtyChange(item.id, item.quantity + 1);
                              }}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive min-h-8 px-2 text-xs"
                            disabled={busy || voidOrderItem.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              setVoidItemId(item.id);
                            }}
                          >
                            {t('voidLine')}
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>

                {order.notes ? (
                  <p className="text-muted-foreground text-xs">{order.notes}</p>
                ) : null}

                {order.delivery_address ? (
                  <p className="flex items-start gap-1.5 text-xs">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {order.delivery_address}
                  </p>
                ) : null}

                <div className="flex items-center justify-between gap-2 border-t pt-3">
                  <div>
                    <p className="text-sm font-medium">{order.customer_name}</p>
                    {order.customer_phone ? (
                      customerWaUrl ? (
                        <a
                          href={customerWaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageCircle className="h-3 w-3" aria-hidden="true" />
                          <span dir="ltr" className="unicode-bidi-plaintext">
                            {displayPhone}
                          </span>
                        </a>
                      ) : (
                        <p className="text-muted-foreground flex items-center gap-1 text-xs">
                          <Phone className="h-3 w-3" aria-hidden="true" />
                          <span dir="ltr" className="unicode-bidi-plaintext">
                            {displayPhone}
                          </span>
                        </p>
                      )
                    ) : null}
                  </div>
                  <p className="font-heading text-base font-semibold tabular-nums">
                    {formattedTotal}
                  </p>
                </div>

                {Number(order.discount_amount) > 0 ? (
                  <p className="text-muted-foreground text-end text-xs tabular-nums">
                    {order.coupon_code ? `${order.coupon_code} · ` : ''}−
                    {formatCurrencyAmount(Number(order.discount_amount), order.currency, {
                      locale: currencyLocale,
                    })}
                  </p>
                ) : null}

                {Number(order.delivery_fee) > 0 ? (
                  <p className="text-muted-foreground text-end text-xs tabular-nums">
                    {t('deliveryFee')}:{' '}
                    {formatCurrencyAmount(Number(order.delivery_fee), order.currency, {
                      locale: currencyLocale,
                    })}
                  </p>
                ) : null}

                {order.paid_at && order.payment_method ? (
                  <div className="bg-muted/50 space-y-1 rounded-lg p-2 text-xs">
                    <p>
                      {t('paymentMethodLabel')}: {t(`paymentMethod.${order.payment_method}`)}
                    </p>
                    {order.payment_method === 'cash' ? (
                      <>
                        <p className="tabular-nums">
                          {t('paymentAmountReceived')}:{' '}
                          {formatCurrencyAmount(
                            Number(order.amount_received ?? 0),
                            order.currency,
                            {
                              locale: currencyLocale,
                            }
                          )}
                        </p>
                        <p className="tabular-nums">
                          {t('paymentChangeDue')}:{' '}
                          {formatCurrencyAmount(Number(order.change_due ?? 0), order.currency, {
                            locale: currencyLocale,
                          })}
                        </p>
                      </>
                    ) : null}
                  </div>
                ) : null}

                {order.fulfillment_type === 'delivery' ? (
                  <DeliveryFeeField
                    key={`${order.id}-${Number(order.delivery_fee ?? 0)}`}
                    orderId={order.id}
                    deliveryFee={order.delivery_fee}
                    busy={busy}
                    t={t}
                  />
                ) : null}

                <div className="grid gap-2">
                  {canEditOrder ? (
                    <Button
                      variant="outline"
                      className="min-h-11"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddItemsOpen(true);
                      }}
                    >
                      {t('editAddItems')}
                    </Button>
                  ) : null}
                  {hasDailyOps && order.status !== 'cancelled' && order.status !== 'completed' ? (
                    <Button
                      variant="outline"
                      className="min-h-11"
                      disabled={busy || voidOrder.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        setVoidOrderOpen(true);
                      }}
                    >
                      {t('voidOrder')}
                    </Button>
                  ) : order.status !== 'cancelled' && order.status !== 'completed' ? (
                    <Button
                      variant="outline"
                      className="min-h-11"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatus(order, 'cancelled');
                      }}
                    >
                      {t('action.cancelled')}
                    </Button>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      ref={frontPrintRef}
                      type="button"
                      variant="outline"
                      className="min-h-11 whitespace-normal"
                      disabled={busy || receiptBusy}
                      aria-pressed={flipped}
                      aria-label={t('printReceipt')}
                      onClick={(e) => {
                        e.stopPropagation();
                        flipToReceipt();
                      }}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        void runReceiptAction('pdf');
                      }}
                    >
                      <Download className="me-2 h-4 w-4" aria-hidden="true" />
                      {t('downloadReceipt')}
                    </Button>
                  </div>
                  <KitchenPrintButton
                    order={order}
                    locale={locale}
                    t={t}
                    disabled={busy || receiptBusy}
                    className="w-full"
                  />
                  <Button
                    variant="secondary"
                    className="min-h-11"
                    disabled={busy || !whatsappConfigured}
                    onClick={(e) => {
                      e.stopPropagation();
                      onWhatsApp(order);
                    }}
                  >
                    <MessageCircle className="me-2 h-4 w-4" aria-hidden="true" />
                    {order.whatsapp_sent ? t('sendWhatsAppAgain') : t('sendWhatsApp')}
                  </Button>
                  {onDelete ? (
                    <Button
                      variant="destructive"
                      className="min-h-11"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(order);
                      }}
                    >
                      <Trash2 className="me-2 h-4 w-4" aria-hidden="true" />
                      {t('deleteOrder')}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </article>

        <div
          role="region"
          aria-label={t('receiptPreview')}
          aria-hidden={!flipped}
          inert={!flipped}
          className={cn(
            'bg-background backface-hidden rotate-y-180 motion-reduce:rotate-y-0 rtl:-rotate-y-180 w-full min-w-0 overflow-hidden rounded-xl border shadow-sm',
            flipped
              ? 'relative'
              : 'pointer-events-none absolute inset-x-0 top-0 motion-reduce:hidden'
          )}
        >
          <div className="flex flex-col gap-3 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-heading text-lg font-semibold tabular-nums">
                  {order.order_number}
                </p>
                <p className="text-muted-foreground text-xs">{t('receiptPreview')}</p>
              </div>
              <Button
                ref={flipBackRef}
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={(e) => {
                  e.stopPropagation();
                  unflip();
                }}
              >
                {t('flipBack')}
              </Button>
            </div>

            <div className="bg-muted w-full min-w-0 rounded-lg p-2">
              <div
                ref={wellRef}
                className="receipt-preview-well flex w-full min-w-0 items-start justify-center overflow-hidden"
                style={receiptWellHeight != null ? { height: receiptWellHeight } : undefined}
              >
                <div
                  className="inline-block"
                  style={{
                    transform: `scale(${receiptScale})`,
                    transformOrigin: 'top center',
                  }}
                >
                  <OrderReceipt
                    order={order}
                    settings={settings}
                    locale={locale}
                    currencyLocale={currencyLocale}
                    t={t}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                className="min-h-11 whitespace-normal"
                disabled={busy || receiptBusy}
                aria-label={t('printReceipt')}
                onClick={(e) => {
                  e.stopPropagation();
                  void runReceiptAction('print');
                }}
              >
                <Printer className="me-2 h-4 w-4" aria-hidden="true" />
                {t('printReceipt')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={(e) => {
                  e.stopPropagation();
                  unflip();
                }}
              >
                {t('flipBack')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <VoidReasonDialog
        open={voidOrderOpen}
        onOpenChange={setVoidOrderOpen}
        title={t('voidOrder')}
        description={t('voidOrderConfirm', { number: order.order_number })}
        confirmLabel={t('voidOrder')}
        cancelLabel={t('voidCancel')}
        reasonLabel={t('voidReasonLabel')}
        reasonPlaceholder={t('voidReasonPlaceholder')}
        loading={voidOrder.isPending}
        onConfirm={(reason) => {
          voidOrder.mutate(
            { orderId: order.id, reason },
            {
              onSuccess: () => {
                toast.success(t('voidOrderSuccess'));
                setVoidOrderOpen(false);
              },
              onError: handleVoidError,
            }
          );
        }}
      />

      <VoidReasonDialog
        open={voidItemId != null}
        onOpenChange={(open) => {
          if (!open) setVoidItemId(null);
        }}
        title={t('voidLine')}
        description={t('voidLineConfirm')}
        confirmLabel={t('voidLine')}
        cancelLabel={t('voidCancel')}
        reasonLabel={t('voidReasonLabel')}
        reasonPlaceholder={t('voidReasonPlaceholder')}
        loading={voidOrderItem.isPending}
        onConfirm={(reason) => {
          if (!voidItemId) return;
          voidOrderItem.mutate(
            { itemId: voidItemId, reason },
            {
              onSuccess: () => {
                toast.success(t('voidLineSuccess'));
                setVoidItemId(null);
              },
              onError: handleVoidError,
            }
          );
        }}
      />
      <OrderAddItemsDialog
        order={order}
        open={addItemsOpen}
        onOpenChange={setAddItemsOpen}
        locale={locale}
        currencyLocale={currencyLocale}
      />
    </div>
  );
}
