'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCloseOrderPayment } from '@/hooks/useOrderPayment';
import {
  computeChangeDue,
  isValidCashReceived,
  parseAmountReceived,
  PAYMENT_METHODS,
  type PaymentMethod,
} from '@/lib/order/payment-close';
import { formatCurrencyAmount } from '@/lib/order/format-currency';
import { cn } from '@/lib/utils';
import type { OrderWithItems } from '@/types/database';

interface PaymentClosePanelProps {
  order: OrderWithItems;
  currencyLocale: 'en' | 'ar' | 'fr' | 'nl';
  busy: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
  onSuccess?: () => void;
}

export function PaymentClosePanel({
  order,
  currencyLocale,
  busy,
  t,
  onSuccess,
}: PaymentClosePanelProps) {
  const closePayment = useCloseOrderPayment();
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [cashDraft, setCashDraft] = useState('');

  const total = Number(order.total);
  const received = parseAmountReceived(cashDraft);
  const changeDue = useMemo(
    () => (method === 'cash' && received != null ? computeChangeDue(total, received) : 0),
    [method, received, total]
  );

  const canSubmit =
    !busy &&
    !closePayment.isPending &&
    (method !== 'cash' || (received != null && isValidCashReceived(total, received)));

  const handleSubmit = () => {
    if (!canSubmit) return;
    closePayment.mutate(
      {
        orderId: order.id,
        paymentMethod: method,
        amountReceived: method === 'cash' ? received : null,
      },
      {
        onSuccess: () => {
          toast.success(t('paymentCloseSuccess'));
          onSuccess?.();
        },
        onError: (err) => {
          const code = err instanceof Error ? err.message : 'payment_failed';
          const known = [
            'already_paid',
            'insufficient_cash',
            'invalid_payment_method',
            'order_cancelled',
            'shift_closed',
          ];
          toast.error(known.includes(code) ? t(`paymentError.${code}`) : t('paymentError.generic'));
        },
      }
    );
  };

  return (
    <div
      className="space-y-3 rounded-lg border border-dashed p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-sm font-medium">{t('paymentCloseTitle')}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {PAYMENT_METHODS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={method === value}
            disabled={busy || closePayment.isPending}
            onClick={() => setMethod(value)}
            className={cn(
              'focus-visible:ring-ring min-h-11 touch-manipulation rounded-lg border px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2',
              method === value
                ? 'border-secondary bg-secondary/10 text-secondary'
                : 'border-border text-muted-foreground'
            )}
          >
            {t(`paymentMethod.${value}`)}
          </button>
        ))}
      </div>

      {method === 'cash' ? (
        <div className="space-y-1">
          <Label htmlFor={`cash-received-${order.id}`} className="text-xs">
            {t('paymentAmountReceived')}
          </Label>
          <Input
            id={`cash-received-${order.id}`}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            dir="ltr"
            className="min-h-11"
            value={cashDraft}
            disabled={busy || closePayment.isPending}
            onChange={(e) => setCashDraft(e.target.value)}
          />
          {received != null && received < total ? (
            <p className="text-destructive text-xs">{t('paymentInsufficientCash')}</p>
          ) : null}
          {received != null && received >= total ? (
            <p className="text-muted-foreground text-xs tabular-nums">
              {t('paymentChangeDue')}:{' '}
              {formatCurrencyAmount(changeDue, order.currency, { locale: currencyLocale })}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between text-sm">
        <span>{t('receiptTotal')}</span>
        <span className="font-heading font-semibold tabular-nums">
          {formatCurrencyAmount(total, order.currency, { locale: currencyLocale })}
        </span>
      </div>

      <Button
        type="button"
        className="min-h-12 w-full text-base font-semibold"
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        {closePayment.isPending ? t('paymentClosing') : t('paymentCloseAndComplete')}
      </Button>
    </div>
  );
}
