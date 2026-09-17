'use client';

import { useCallback, useEffect, useState } from 'react';
import { TicketPercent, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { haptic } from '@/lib/haptics';
import { couponErrorMessageKey } from '@/lib/order/coupon-errors';
import { formatCurrencyAmount, type CurrencyLocale } from '@/lib/order/format-currency';
import { cn } from '@/lib/utils';
import type { DiningMode } from '@/lib/order/totals';

export interface DiscountApplicationLine {
  code: string;
  discountAmount: number;
  discountType: 'percentage' | 'fixed' | 'bogo' | null;
  discountValue: number | null;
  requiresCode: boolean;
}

export interface AppliedCoupon {
  code: string | null;
  discountAmount: number;
  discountType: 'percentage' | 'fixed' | 'bogo' | null;
  discountValue: number | null;
  subtotal: number;
  tax: number;
  service: number;
  total: number;
  applications?: DiscountApplicationLine[];
}

interface PreviewCartItem {
  product_id: string;
  quantity: number;
  size_option?: 'small' | 'large' | null;
  weight_grams?: number | null;
  notes?: string | null;
}

interface CheckoutCouponProps {
  items: PreviewCartItem[];
  diningMode: DiningMode;
  customerPhone: string;
  phoneCountry: string;
  currency: string;
  currencyLocale: CurrencyLocale;
  applied: AppliedCoupon | null;
  onApplied: (coupon: AppliedCoupon) => void;
  onRemoved: () => void;
}

interface PreviewResponse {
  valid?: boolean;
  error?: string | null;
  code?: string | null;
  discount_type?: 'percentage' | 'fixed' | 'bogo' | null;
  discount_value?: number | null;
  discount_amount?: number;
  applications?: Array<{
    code?: string | null;
    discount_amount?: number;
    discount_type?: 'percentage' | 'fixed' | 'bogo' | null;
    discount_value?: number | null;
    requires_code?: boolean;
    automatic?: boolean;
  }>;
  subtotal?: number;
  tax?: number;
  service?: number;
  total?: number;
}

function mapPreview(payload: PreviewResponse, fallbackCode?: string | null): AppliedCoupon {
  const applications = (payload.applications ?? []).map((app) => ({
    code: app.code ?? '',
    discountAmount: Number(app.discount_amount ?? 0),
    discountType: app.discount_type ?? null,
    discountValue: app.discount_value ?? null,
    requiresCode: app.requires_code != null ? app.requires_code !== false : app.automatic !== true,
  }));

  return {
    code: payload.code ?? fallbackCode ?? null,
    discountAmount: Number(payload.discount_amount ?? 0),
    discountType: payload.discount_type ?? null,
    discountValue: payload.discount_value ?? null,
    subtotal: Number(payload.subtotal ?? 0),
    tax: Number(payload.tax ?? 0),
    service: Number(payload.service ?? 0),
    total: Number(payload.total ?? 0),
    applications,
  };
}

export async function previewCheckoutDiscounts(input: {
  items: PreviewCartItem[];
  diningMode: DiningMode;
  customerPhone: string;
  phoneCountry: string;
  couponCode?: string | null;
}): Promise<AppliedCoupon | null> {
  const response = await fetch('/api/coupons/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: input.items,
      dining_mode: input.diningMode,
      coupon_code: input.couponCode ?? null,
      customer_phone: input.customerPhone || null,
      phone_country: input.phoneCountry,
    }),
  });
  const payload = (await response.json().catch(() => null)) as PreviewResponse | null;
  if (!response.ok || !payload?.valid) return null;
  return mapPreview(payload, input.couponCode ?? null);
}

export function CheckoutCoupon({
  items,
  diningMode,
  customerPhone,
  phoneCountry,
  currency,
  currencyLocale,
  applied,
  onApplied,
  onRemoved,
}: CheckoutCouponProps) {
  const t = useTranslations('checkout');
  const [open, setOpen] = useState(Boolean(applied));
  const [code, setCode] = useState(applied?.code ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cartKey = `${diningMode}|${customerPhone}|${phoneCountry}|${items
    .map(
      (item) =>
        `${item.product_id}:${item.quantity}:${item.size_option ?? ''}:${item.weight_grams ?? ''}`
    )
    .join(',')}`;

  const preview = useCallback(
    async (nextCode: string, options?: { haptic?: boolean }) => {
      const trimmed = nextCode.trim().toUpperCase();
      if (trimmed.length < 2) {
        setError(t('couponInvalid'));
        if (options?.haptic) haptic.error();
        return;
      }

      setBusy(true);
      setError(null);
      try {
        const response = await fetch('/api/coupons/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items,
            dining_mode: diningMode,
            coupon_code: trimmed,
            customer_phone: customerPhone || null,
            phone_country: phoneCountry,
          }),
        });
        const payload = (await response.json().catch(() => null)) as PreviewResponse | null;
        if (!response.ok) {
          const failCode = payload && 'code' in payload ? String(payload.code) : null;
          if (failCode === 'rate_limited') setError(t('rateLimited'));
          else setError(t(couponErrorMessageKey(failCode)));
          onRemoved();
          if (options?.haptic) haptic.error();
          return;
        }
        if (!payload?.valid) {
          setError(t(couponErrorMessageKey(payload?.error ?? null)));
          onRemoved();
          if (options?.haptic) haptic.error();
          return;
        }
        onApplied(mapPreview(payload, trimmed));
        if (options?.haptic) haptic.success();
      } catch {
        setError(t('couponApplyFailed'));
        onRemoved();
        if (options?.haptic) haptic.error();
      } finally {
        setBusy(false);
      }
    },
    [customerPhone, diningMode, items, onApplied, onRemoved, phoneCountry, t]
  );

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync applied coupon into local field state */
    if (applied?.code) {
      setOpen(true);
      setCode(applied.code);
      setError(null);
    }
  }, [applied]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- revalidate preview when cart changes */
    if (!applied?.code) return;
    void preview(applied.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revalidate when the cart or phone changes
  }, [cartKey]);

  const handleRemove = () => {
    setCode('');
    setError(null);
    setOpen(false);
    onRemoved();
  };

  if (applied && applied.code) {
    return (
      <section
        className="rounded-xl border border-dashed border-[var(--menu-gold-soft)] bg-[var(--menu-gold-wash)] px-4 py-3"
        data-testid="checkout-coupon-applied"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.18em]">
              {t('couponApplied')}
            </p>
            <p className="font-heading mt-0.5 truncate text-base font-semibold tracking-[0.12em]">
              {applied.code}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-end">
              <p className="text-sm font-semibold tabular-nums text-[var(--menu-wine)]">
                −
                {formatCurrencyAmount(applied.discountAmount, currency, {
                  locale: currencyLocale,
                })}
              </p>
              <p className="text-xs text-[var(--menu-ink-soft)]">
                {t('couponSaved', {
                  amount: formatCurrencyAmount(applied.discountAmount, currency, {
                    locale: currencyLocale,
                  }),
                })}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 min-w-11 touch-manipulation rounded-full"
              onClick={handleRemove}
              aria-label={t('removeCoupon')}
              data-testid="checkout-coupon-remove"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[var(--menu-line)] bg-[var(--menu-surface)] p-4">
      <button
        type="button"
        className="flex min-h-11 w-full touch-manipulation items-center gap-2 text-start"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        data-testid="checkout-coupon-toggle"
      >
        <TicketPercent className="h-5 w-5 text-[var(--menu-wine)]" aria-hidden="true" />
        <span className="font-medium">{t('haveCoupon')}</span>
      </button>
      <p className="mt-1 text-xs leading-relaxed text-[var(--menu-ink-soft)]">
        {t('offersNotCodesHint')}
      </p>

      {open ? (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void preview(code, { haptic: true });
                }
              }}
              placeholder={t('couponPlaceholder')}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="h-11 min-h-11 flex-1 text-base uppercase tracking-[0.16em]"
              data-testid="checkout-coupon-input"
            />
            <Button
              type="button"
              className={cn(
                'min-h-11 min-w-11 touch-manipulation rounded-xl bg-[var(--menu-wine)] px-4 text-[#FDF7F0]',
                'hover:bg-[var(--menu-wine-deep)]'
              )}
              disabled={busy || code.trim().length < 2}
              onClick={() => void preview(code, { haptic: true })}
              data-testid="checkout-coupon-apply"
            >
              {busy ? t('couponApplying') : t('applyCoupon')}
            </Button>
          </div>
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
