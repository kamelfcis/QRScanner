'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  ChevronDown,
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
import { Image } from '@/components/shared/Image';
import { formatLocaleDate } from '@/lib/dateLocale';
import { formatCurrencyAmount } from '@/lib/order/format-currency';
import { buildCustomerWhatsAppUrl, formatDisplayPhone } from '@/lib/phone/normalize';
import { downloadReceiptPdf, printReceiptElement, receiptDomId } from '@/lib/order/print-receipt';
import { cn, getLocalizedText } from '@/lib/utils';
import type { OrderStatus, OrderWithItems, RestaurantSettings } from '@/types/database';
import { OrderReceipt } from '@/components/dashboard/orders/OrderReceipt';
import { COLUMN_TONE } from '@/components/dashboard/orders/column-tone';

const MAX_THUMBS = 4;

function isUnacknowledged(order: OrderWithItems): boolean {
  return order.status === 'new' && !order.staff_acknowledged_at;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

function totalItemCount(items: OrderWithItems['items']): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

function ItemPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-muted flex shrink-0 items-center justify-center rounded-lg border',
        className
      )}
    >
      <UtensilsCrossed className="text-muted-foreground/50 h-4 w-4" aria-hidden="true" />
    </div>
  );
}

function ItemThumb({
  imageUrl,
  alt,
  size,
  className,
}: {
  imageUrl: string | null | undefined;
  alt: string;
  size: 'sm' | 'md';
  className?: string;
}) {
  const dim = size === 'sm' ? 'size-11' : 'size-12';
  if (!imageUrl) {
    return <ItemPlaceholder className={cn(dim, className)} />;
  }
  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={size === 'sm' ? 44 : 48}
      height={size === 'sm' ? 44 : 48}
      className={cn('rounded-lg object-cover', dim, className)}
      containerClassName={cn('shrink-0 rounded-lg', dim, className)}
    />
  );
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
  onDelete: (order: OrderWithItems) => void;
}) {
  const needsAck = isUnacknowledged(order);
  const [expanded, setExpanded] = useState(needsAck || order.status === 'new');
  const [receiptBusy, setReceiptBusy] = useState(false);

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
  const thumbs = order.items.slice(0, MAX_THUMBS);
  const leftover = order.items.length - MAX_THUMBS;
  const formattedTotal = formatCurrencyAmount(Number(order.total), order.currency, {
    locale: currencyLocale,
  });

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
    <article
      className={cn(
        'bg-background rounded-xl border shadow-sm transition-colors duration-200 motion-reduce:transition-none',
        needsAck && 'border-amber-400 ring-2 ring-amber-400/40'
      )}
    >
      <button
        type="button"
        className={cn(
          'hover:bg-muted/40 flex min-h-11 w-full flex-col gap-2 rounded-t-xl p-3 text-start transition-colors duration-200 motion-reduce:transition-none',
          !expanded && 'rounded-b-xl'
        )}
        aria-expanded={expanded}
        aria-label={expanded ? t('collapseItems') : t('expandItems')}
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-heading text-lg font-semibold tabular-nums">{order.order_number}</p>
            <p className="text-muted-foreground text-xs">
              {formatLocaleDate(order.created_at, 'HH:mm', locale)}
            </p>
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
            <span className="text-muted-foreground truncate">{firstName(order.customer_name)}</span>
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
        <div className="grid gap-2 px-3 pb-3">
          {needsAck ? (
            <Button
              className="min-h-11 bg-amber-600 text-white hover:bg-amber-700"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                onAcknowledge(order.id);
              }}
            >
              {t('acknowledge')}
            </Button>
          ) : null}
          {nextStatus ? (
            <Button
              className="min-h-11"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
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
                    <p>
                      <span className="tabular-nums">{item.quantity}×</span> {localizedName(item)}
                      {item.size_option ? (
                        <span className="text-muted-foreground ms-1 text-xs">
                          ({item.size_option === 'small' ? t('small') : t('large')})
                        </span>
                      ) : null}
                    </p>
                    {item.notes ? (
                      <p className="text-muted-foreground text-xs">{item.notes}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            {order.notes ? <p className="text-muted-foreground text-xs">{order.notes}</p> : null}

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
              <p className="font-heading text-base font-semibold tabular-nums">{formattedTotal}</p>
            </div>

            {Number(order.discount_amount) > 0 ? (
              <p className="text-muted-foreground text-end text-xs tabular-nums">
                {order.coupon_code ? `${order.coupon_code} · ` : ''}−
                {formatCurrencyAmount(Number(order.discount_amount), order.currency, {
                  locale: currencyLocale,
                })}
              </p>
            ) : null}

            <div className="grid gap-2">
              {order.status !== 'cancelled' && order.status !== 'completed' ? (
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
                  type="button"
                  variant="outline"
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
            </div>
          </div>
        </div>
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
