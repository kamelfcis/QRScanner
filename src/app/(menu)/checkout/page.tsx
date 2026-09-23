'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageCircle, ShoppingBag, Truck, Store } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Image } from '@/components/shared/Image';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { MenuThemeScope } from '@/components/menu/MenuThemeScope';
import { useCartStore, type FulfillmentType } from '@/stores/cart-store';
import { useFeatureSettings, useRestaurantSettings } from '@/hooks/useSettings';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { fadeInUp } from '@/lib/motion';
import { getName, cn } from '@/lib/utils';
import { calculateOrderTotals, getCartLineUnitPrice } from '@/lib/order/totals';
import {
  CheckoutCoupon,
  previewCheckoutDiscounts,
  type AppliedCoupon,
} from '@/components/checkout/CheckoutCoupon';
import { couponErrorMessageKey, isCouponErrorCode } from '@/lib/order/coupon-errors';
import {
  formatCurrencyAmount,
  formatCurrencyNumber,
  getRestaurantCurrency,
  toCurrencyLocale,
} from '@/lib/order/format-currency';
import { validateOrder } from '@/lib/order/validation';
import {
  buildOrderPayload,
  openWhatsAppUrl,
  WHATSAPP_POPUP_BLOCKED_KEY,
} from '@/lib/order/build-order';
import {
  trackCheckoutStart,
  trackDiningOrder,
  trackTakeawayOrder,
  trackOrderWhatsApp,
} from '@/lib/analytics';
import { playSound } from '@/lib/ux/sound';
import { triggerHaptic } from '@/lib/ux/haptic';
import { normalizeWhatsAppPhone } from '@/lib/order/whatsapp-url';
import { useDetectedDialCode } from '@/hooks/useDetectedDialCode';
import { normalizeLocalPhone, formatDisplayPhone } from '@/lib/phone/normalize';
import { getFulfillmentOptions, resolveOrderModes } from '@/lib/order/order-modes';
import { cartLinesToLastOrderItems, writeLastOrder } from '@/lib/order/last-order';
import { useOpeningHoursStatus } from '@/hooks/useOpeningHoursStatus';
import { useDeliveryLocations } from '@/hooks/useDeliveryLocations';
import {
  buildDeliveryAddressSnapshot,
  formatDeliveryLocationOption,
} from '@/lib/order/delivery-location';
import { resolveEffectiveMinimumOrder } from '@/lib/order/delivery-min-order';
import { hasHettSamakaTier3 } from '@/i18n/config';

export default function CheckoutPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const t = useTranslations('checkout');
  const tCart = useTranslations('cart');
  const tMenu = useTranslations('menu');
  const tCommon = useTranslations('common');
  const prefersReducedMotion = useReducedMotion();
  const { data: settings, isLoading } = useRestaurantSettings();
  const { data: features } = useFeatureSettings();
  const dashboardOrders = features?.dashboard_orders === true;
  const couponsEnabled = dashboardOrders && features?.coupons === true;

  const items = useCartStore((s) => s.items);
  const diningMode = useCartStore((s) => s.diningMode);
  const tableNumber = useCartStore((s) => s.tableNumber);
  const fulfillmentType = useCartStore((s) => s.fulfillmentType);
  const deliveryLocationId = useCartStore((s) => s.deliveryLocationId);
  const deliveryAddressDetails = useCartStore((s) => s.deliveryAddressDetails);
  const customerName = useCartStore((s) => s.customerName);
  const customerPhone = useCartStore((s) => s.customerPhone);
  const orderNotes = useCartStore((s) => s.orderNotes);
  const setMeta = useCartStore((s) => s.setMeta);

  const [submitting, setSubmitting] = useState(false);
  const [canRetry, setCanRetry] = useState(false);
  const submittingRef = useRef(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [trackedStart, setTrackedStart] = useState(false);
  const [manualCoupon, setManualCoupon] = useState<AppliedCoupon | null>(null);
  const [autoDiscount, setAutoDiscount] = useState<AppliedCoupon | null>(null);
  const appliedCoupon = manualCoupon ?? autoDiscount;

  const currency = getRestaurantCurrency(settings?.currency);
  const currencyLocale = toCurrencyLocale(locale);
  const orderModes = useMemo(() => resolveOrderModes(settings), [settings]);
  const fulfillmentOptions = useMemo(() => getFulfillmentOptions(orderModes), [orderModes]);
  const detectedDial = useDetectedDialCode(locale, { currency: settings?.currency });
  const maxNotes = settings?.max_order_notes_length ?? 200;
  const whatsappConfigured = Boolean(normalizeWhatsAppPhone(settings?.whatsapp || ''));
  const isTakeaway = diningMode === 'takeaway';
  const requiresDelivery = isTakeaway && fulfillmentType === 'delivery';
  const requireWhatsApp = !dashboardOrders;
  const { data: deliveryLocations, isLoading: locationsLoading } = useDeliveryLocations();

  useEffect(() => {
    if (!orderModes.dineIn && diningMode !== 'takeaway') {
      setMeta({ diningMode: 'takeaway' });
    }
  }, [orderModes.dineIn, diningMode, setMeta]);

  useEffect(() => {
    if (!isTakeaway || fulfillmentOptions.length === 0) return;
    if (!fulfillmentOptions.includes(fulfillmentType)) {
      const fallback = fulfillmentOptions[0];
      setMeta({
        fulfillmentType: fallback,
        ...(fallback === 'pickup'
          ? { deliveryLocationId: null, deliveryAddressDetails: '', deliveryAddress: '' }
          : {}),
      });
    }
  }, [isTakeaway, fulfillmentOptions, fulfillmentType, setMeta]);

  const pricedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        unitPrice: getCartLineUnitPrice(item, diningMode),
      })),
    [items, diningMode]
  );

  const selectedLocation = useMemo(
    () => deliveryLocations?.find((loc) => loc.id === deliveryLocationId) ?? null,
    [deliveryLocations, deliveryLocationId]
  );

  const deliveryFee =
    requiresDelivery && selectedLocation ? Number(selectedLocation.delivery_fee) : 0;
  const effectiveMinimumOrder = useMemo(
    () => resolveEffectiveMinimumOrder(settings?.minimum_order ?? 0, selectedLocation),
    [settings?.minimum_order, selectedLocation]
  );
  const { paused: orderingBlocked, outsideHours } = useOpeningHoursStatus();

  const localTotals = useMemo(
    () =>
      calculateOrderTotals(
        pricedItems.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })),
        settings,
        null,
        deliveryFee
      ),
    [pricedItems, settings, deliveryFee]
  );

  const totals = appliedCoupon
    ? {
        ...localTotals,
        subtotal: appliedCoupon.subtotal,
        discount: appliedCoupon.discountAmount,
        tax: appliedCoupon.tax,
        service: appliedCoupon.service,
        deliveryFee,
        total: appliedCoupon.total + deliveryFee,
      }
    : localTotals;

  const composedDeliveryAddress = useMemo(() => {
    if (!requiresDelivery || !selectedLocation) return null;
    return buildDeliveryAddressSnapshot(locale, selectedLocation, deliveryAddressDetails);
  }, [requiresDelivery, selectedLocation, deliveryAddressDetails, locale]);

  const noActiveLocations =
    requiresDelivery && !locationsLoading && (deliveryLocations?.length ?? 0) === 0;

  const previewItems = useMemo(
    () =>
      items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        size_option: item.has_size_options ? item.sizeOption : null,
        weight_grams: item.weightGrams ?? null,
        notes: item.notes || null,
      })),
    [items]
  );

  const handleCouponApplied = useCallback((coupon: AppliedCoupon) => {
    setManualCoupon(coupon);
  }, []);

  const handleCouponRemoved = useCallback(() => {
    setManualCoupon(null);
  }, []);

  const discountCartKey = `${diningMode}|${customerPhone}|${previewItems
    .map(
      (item) =>
        `${item.product_id}:${item.quantity}:${item.size_option ?? ''}:${item.weight_grams ?? ''}`
    )
    .join(',')}|${manualCoupon?.code ?? ''}`;

  useEffect(() => {
    if (!couponsEnabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- drop a stale preview when coupons are off
      setAutoDiscount(null);
      return;
    }
    if (manualCoupon?.code) return;
    if (previewItems.length === 0) {
      setAutoDiscount(null);
      return;
    }

    let cancelled = false;
    void previewCheckoutDiscounts({
      items: previewItems,
      diningMode,
      customerPhone,
      phoneCountry: detectedDial.country,
      couponCode: null,
    }).then((preview) => {
      if (!cancelled) setAutoDiscount(preview);
    });

    return () => {
      cancelled = true;
    };
  }, [
    couponsEnabled,
    customerPhone,
    detectedDial.country,
    diningMode,
    discountCartKey,
    manualCoupon?.code,
    previewItems,
  ]);

  useEffect(() => {
    if (!trackedStart && items.length > 0) {
      trackCheckoutStart(
        items.reduce((n, i) => n + i.quantity, 0),
        totals.total
      );
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fire analytics once per visit
      setTrackedStart(true);
    }
  }, [trackedStart, items, totals.total]);

  const resolveErrors = (codes: ReturnType<typeof validateOrder>['codes']) => {
    return codes.map((code) => {
      switch (code) {
        case 'empty_cart':
          return t('emptyCart');
        case 'whatsapp_missing':
          return t('whatsappMissing');
        case 'name_required':
          return t('nameRequired');
        case 'address_required':
          return t('addressRequired');
        case 'min_order':
          return t('minOrder', {
            amount: formatCurrencyNumber(effectiveMinimumOrder, currencyLocale),
            currency,
          });
        case 'notes_too_long':
          return t('notesTooLong', { max: maxNotes });
        default:
          return tCommon('error');
      }
    });
  };

  const reportFailure = (messages: string[], retryable: boolean) => {
    triggerHaptic('error');
    playSound('error');
    setCanRetry(retryable);
    setErrors(messages);
    setSubmitting(false);
    submittingRef.current = false;
  };

  const handleConfirm = async () => {
    if (submittingRef.current) return;

    const result = validateOrder({
      customerName,
      orderNotes,
      itemNotes: items.map((i) => i.notes),
      subtotal: totals.subtotal,
      minimumOrder: effectiveMinimumOrder,
      maxOrderNotesLength: maxNotes,
      whatsappConfigured,
      requireWhatsApp,
      hasItems: items.length > 0,
      requiresDeliveryLocation: requiresDelivery,
      deliveryLocationId,
    });

    if (!result.valid) {
      reportFailure(resolveErrors(result.codes), false);
      return;
    }

    if (!settings) return;

    if (orderingBlocked) {
      reportFailure(
        [outsideHours && hasHettSamakaTier3 ? tMenu('closedNowTitle') : t('ordersClosed')],
        false
      );
      return;
    }

    submittingRef.current = true;
    triggerHaptic('medium');
    playSound('checkout');
    setCanRetry(false);
    setSubmitting(true);
    setErrors([]);

    try {
      const sendWhatsApp = whatsappConfigured;
      let orderNumber: string | null = null;
      const normalizedPhone = customerPhone
        ? normalizeLocalPhone(customerPhone, detectedDial.country)
        : null;
      const displayPhone = normalizedPhone ? formatDisplayPhone(normalizedPhone) : null;

      if (dashboardOrders) {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items.map((item) => ({
              product_id: item.productId,
              quantity: item.quantity,
              size_option: item.has_size_options ? item.sizeOption : null,
              weight_grams: item.weightGrams ?? null,
              notes: item.notes || null,
            })),
            dining_mode: diningMode,
            fulfillment_type: isTakeaway ? fulfillmentType : null,
            table_number: tableNumber,
            customer_name: customerName,
            customer_phone: normalizedPhone,
            phone_country: detectedDial.country,
            delivery_location_id: requiresDelivery ? deliveryLocationId : null,
            delivery_address_details: requiresDelivery ? deliveryAddressDetails || null : null,
            notes: orderNotes || null,
            locale: toCurrencyLocale(locale),
            whatsapp_sent: sendWhatsApp,
            coupon_code: manualCoupon?.code ?? null,
          }),
        });

        const payload = (await response.json().catch(() => null)) as {
          order_number?: string;
          id?: string;
          total?: number;
          currency?: string;
          code?: string;
          error?: string;
        } | null;

        if (!response.ok || !payload?.order_number) {
          const code = payload?.code;
          let message = t('placeFailed');
          if (code === 'rate_limited') message = t('rateLimited');
          else if (code === 'product_unavailable') message = t('productUnavailable');
          else if (code === 'feature_disabled') message = t('boardUnavailable');
          else if (code === 'orders_closed') message = t('ordersClosed');
          else if (code === 'address_required') message = t('addressRequired');
          else if (code === 'min_order') {
            message = appliedCoupon
              ? t('couponMinOrder')
              : t('minOrder', {
                  amount: formatCurrencyNumber(effectiveMinimumOrder, currencyLocale),
                  currency,
                });
          } else if (isCouponErrorCode(code)) {
            message = t(couponErrorMessageKey(code));
            setManualCoupon(null);
          }
          reportFailure([message], true);
          return;
        }

        orderNumber = payload.order_number;
        writeLastOrder({
          orderNumber: payload.order_number,
          orderId: payload.id,
          phone: normalizedPhone,
          customerName,
          status: 'new',
          diningMode,
          fulfillmentType: isTakeaway ? fulfillmentType : null,
          placedAt: new Date().toISOString(),
          total: typeof payload.total === 'number' ? payload.total : undefined,
          currency: payload.currency,
          ...(hasHettSamakaTier3 ? { items: cartLinesToLastOrderItems(items) } : {}),
        });
      } else if (hasHettSamakaTier3 && normalizedPhone) {
        writeLastOrder({
          orderNumber: `WA-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          phone: normalizedPhone,
          customerName,
          status: 'new',
          diningMode,
          fulfillmentType: isTakeaway ? fulfillmentType : null,
          placedAt: new Date().toISOString(),
          items: cartLinesToLastOrderItems(items),
        });
      }

      const built = sendWhatsApp
        ? buildOrderPayload({
            items,
            diningMode,
            tableNumber,
            fulfillmentType: isTakeaway ? fulfillmentType : null,
            deliveryAddress: composedDeliveryAddress,
            deliveryFee,
            customerName,
            customerPhone: displayPhone,
            orderNotes,
            locale: toCurrencyLocale(locale),
            settings: {
              whatsapp: settings.whatsapp,
              currency: getRestaurantCurrency(settings.currency),
              tax_rate: settings.tax_rate,
              service_charge_rate: settings.service_charge_rate,
              apply_tax: settings.apply_tax,
              apply_service_charge: settings.apply_service_charge,
              prep_time_minutes: settings.prep_time_minutes ?? 25,
            },
            coupon:
              appliedCoupon &&
              appliedCoupon.discountType &&
              (appliedCoupon.discountType === 'percentage' ||
                appliedCoupon.discountType === 'fixed')
                ? {
                    type: appliedCoupon.discountType,
                    value: appliedCoupon.discountValue ?? 0,
                  }
                : null,
            couponCode: appliedCoupon?.code ?? null,
            orderNumber,
          })
        : null;

      if (diningMode === 'dining') trackDiningOrder();
      else trackTakeawayOrder();

      if (built) {
        trackOrderWhatsApp(
          diningMode,
          built.totals.total,
          items.reduce((n, i) => n + i.quantity, 0)
        );

        try {
          sessionStorage.setItem('warda-last-wa-url', built.whatsappUrl);
          const opened = openWhatsAppUrl(built.whatsappUrl, { navigateOnBlock: false });
          sessionStorage.setItem(WHATSAPP_POPUP_BLOCKED_KEY, opened ? '0' : '1');
        } catch {
          // ignore
        }
      } else {
        try {
          sessionStorage.removeItem(WHATSAPP_POPUP_BLOCKED_KEY);
        } catch {
          // ignore
        }
      }

      const params = new URLSearchParams();
      if (built) params.set('sent', '1');
      if (orderNumber) params.set('order', orderNumber);
      if (hasHettSamakaTier3) {
        const itemCount = items.reduce((n, i) => n + i.quantity, 0);
        params.set('items', String(itemCount));
        params.set(
          'fulfillment',
          isTakeaway ? fulfillmentType : diningMode === 'dining' ? 'dining' : 'pickup'
        );
      }
      playSound('success');
      triggerHaptic('success');
      router.push(`/order-success${params.size ? `?${params.toString()}` : ''}`);
    } catch {
      reportFailure([t('networkError')], true);
    }
  };

  if (isLoading) {
    return (
      <div
        data-menu-theme
        className="flex min-h-[100svh] items-center justify-center bg-[var(--menu-paper)]"
      >
        <MenuThemeScope />
        <div className="bg-muted h-8 w-48 animate-pulse rounded" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        data-menu-theme
        className="mx-auto flex min-h-[100svh] max-w-lg flex-col items-center justify-center gap-4 bg-[var(--menu-paper)] px-4 text-center"
      >
        <MenuThemeScope />
        <p className="font-heading text-lg font-semibold">{t('emptyCart')}</p>
        <Link
          href="/menu"
          className={cn(
            buttonVariants(),
            'h-11 rounded-full bg-[var(--menu-wine)] px-6 text-[#FDF7F0] hover:bg-[var(--menu-wine-deep)]'
          )}
        >
          {t('backToMenu')}
        </Link>
      </div>
    );
  }

  const prepMinutes = settings?.prep_time_minutes ?? 25;
  const logo = settings?.logo_url;
  const restaurantName = getName(
    locale,
    settings?.name_en || tCommon('appName'),
    settings?.name_ar || tCommon('appName')
  );

  return (
    <div
      data-menu-theme
      className="min-h-[100svh] bg-[var(--menu-paper)] pb-[env(safe-area-inset-bottom)]"
    >
      <MenuThemeScope />
      <div className="mx-auto max-w-lg px-4 py-6">
        <motion.div
          initial={prefersReducedMotion ? undefined : 'hidden'}
          animate="visible"
          variants={fadeInUp}
          className="space-y-6"
        >
          <div className="flex items-center gap-3">
            <Link
              href="/menu?cart=1"
              aria-label={t('reviewCart')}
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'h-11 w-11')}
            >
              <ArrowLeft className={cn('h-5 w-5', locale === 'ar' && 'rotate-180')} />
            </Link>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {logo ? (
                <div className="relative h-10 w-10 overflow-hidden rounded-full border border-[var(--menu-line-strong)] bg-[var(--menu-surface)] p-1">
                  <Image
                    src={logo}
                    alt={restaurantName}
                    fill
                    sizes="40px"
                    className="object-contain"
                    containerClassName="absolute inset-0"
                  />
                </div>
              ) : null}
              <div className="min-w-0">
                <h1 className="font-heading truncate text-xl font-semibold">{t('title')}</h1>
                <p className="menu-eyebrow truncate text-[var(--menu-ink-soft)]">
                  {restaurantName}
                </p>
              </div>
            </div>
            <LanguageSwitcher
              variant="ghost"
              className="size-11 shrink-0 rounded-full text-[var(--menu-ink-soft)] hover:text-[var(--menu-ink)]"
            />
          </div>

          {orderingBlocked && (
            <div
              role="alert"
              className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
            >
              {outsideHours && hasHettSamakaTier3 ? tMenu('closedNowTitle') : t('ordersClosed')}
            </div>
          )}

          {!whatsappConfigured && (
            <div role="alert" className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {t('whatsappMissing')}
            </div>
          )}

          {errors.length > 0 && (
            <div role="alert" className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              <ul className="list-inside list-disc">
                {errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
              {canRetry && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 h-11 min-h-11"
                  disabled={submitting}
                  onClick={() => void handleConfirm()}
                  data-testid="checkout-retry"
                >
                  {t('retry')}
                </Button>
              )}
            </div>
          )}

          {submitting ? (
            <div
              className="space-y-3 rounded-xl border border-[var(--menu-line)] bg-[var(--menu-surface)] p-4"
              aria-busy="true"
              aria-live="polite"
              data-testid="checkout-submitting-skeleton"
            >
              <div className="bg-muted h-5 w-32 animate-pulse rounded" />
              <div className="space-y-2">
                <div className="bg-muted h-4 w-full animate-pulse rounded" />
                <div className="bg-muted h-4 w-5/6 animate-pulse rounded" />
                <div className="bg-muted h-4 w-2/3 animate-pulse rounded" />
              </div>
              <div className="border-t border-[var(--menu-line)] pt-3">
                <div className="bg-muted mb-2 h-4 w-full animate-pulse rounded" />
                <div className="bg-muted h-6 w-28 animate-pulse rounded" />
              </div>
              <div className="bg-muted h-14 w-full animate-pulse rounded-full" />
            </div>
          ) : null}

          <section className={cn('space-y-3', submitting && 'pointer-events-none opacity-40')}>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading font-semibold">{t('orderSummary')}</h2>
              <Badge variant="secondary">
                {diningMode === 'dining' ? t('dining') : t('takeaway')}
              </Badge>
              {tableNumber && (
                <Badge variant="outline">
                  {t('table')} {tableNumber}
                </Badge>
              )}
            </div>

            <ul className="space-y-3">
              {pricedItems.map((item) => {
                const name = getName(
                  locale,
                  item.name_en,
                  item.name_ar,
                  item.name_fr,
                  item.name_nl
                );
                return (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 text-sm"
                    data-testid="checkout-line"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        <span className="tabular-nums">{item.quantity}×</span> {name}
                        {item.has_size_options && item.sizeOption ? (
                          <span className="ms-1.5 inline-flex rounded-full bg-[var(--menu-gold-wash)] px-2 py-0.5 text-[10px] font-medium text-[var(--menu-ink-soft)]">
                            {item.sizeOption === 'small' ? tCart('small') : tCart('large')}
                          </span>
                        ) : item.weightGrams != null ? (
                          <span className="ms-1.5 inline-flex rounded-full bg-[var(--menu-gold-wash)] px-2 py-0.5 text-[10px] font-medium text-[var(--menu-ink-soft)]">
                            {tMenu('grams', { grams: item.weightGrams })}
                          </span>
                        ) : null}
                      </p>
                      {item.notes ? <p className="text-muted-foreground">{item.notes}</p> : null}
                    </div>
                    <p className="shrink-0 font-medium tabular-nums">
                      {formatCurrencyAmount(item.unitPrice * item.quantity, currency, {
                        locale: currencyLocale,
                      })}
                    </p>
                  </li>
                );
              })}
            </ul>

            <Link
              href="/menu?cart=1"
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'h-11 min-h-11 w-full rounded-full border-[var(--menu-line-strong)] px-6 text-[var(--menu-ink)] hover:bg-[var(--menu-surface)]'
              )}
            >
              <ShoppingBag className="me-2 h-4 w-4" aria-hidden="true" />
              {t('reviewCart')}
            </Link>
          </section>

          {couponsEnabled ? (
            <CheckoutCoupon
              items={previewItems}
              diningMode={diningMode}
              customerPhone={customerPhone}
              phoneCountry={detectedDial.country}
              currency={currency}
              currencyLocale={currencyLocale}
              applied={manualCoupon}
              onApplied={handleCouponApplied}
              onRemoved={handleCouponRemoved}
            />
          ) : null}

          <section className="space-y-3 rounded-xl border border-[var(--menu-line)] bg-[var(--menu-surface)] p-4">
            <div className="flex justify-between text-sm">
              <span>{t('subtotal')}</span>
              <span className="tabular-nums">
                {formatCurrencyAmount(totals.subtotal, currency, { locale: currencyLocale })}
              </span>
            </div>
            {totals.discount > 0 &&
              (appliedCoupon?.applications?.length ? (
                appliedCoupon.applications.map((line) => (
                  <div
                    key={`${line.code}-${line.discountAmount}`}
                    className="flex justify-between text-sm text-[var(--menu-wine)]"
                  >
                    <span>
                      {line.requiresCode
                        ? t('discountWithCode', { code: line.code })
                        : t('autoDiscount', { code: line.code })}
                    </span>
                    <span className="tabular-nums">
                      −
                      {formatCurrencyAmount(line.discountAmount, currency, {
                        locale: currencyLocale,
                      })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between text-sm text-[var(--menu-wine)]">
                  <span>
                    {appliedCoupon?.code
                      ? t('discountWithCode', { code: appliedCoupon.code })
                      : t('discount')}
                  </span>
                  <span className="tabular-nums">
                    −{formatCurrencyAmount(totals.discount, currency, { locale: currencyLocale })}
                  </span>
                </div>
              ))}
            {totals.applyTax && totals.tax > 0 && (
              <div className="text-muted-foreground flex justify-between text-sm">
                <span>{t('tax', { rate: totals.taxRate })}</span>
                <span className="tabular-nums">
                  {formatCurrencyAmount(totals.tax, currency, { locale: currencyLocale })}
                </span>
              </div>
            )}
            {totals.applyService && totals.service > 0 && (
              <div className="text-muted-foreground flex justify-between text-sm">
                <span>{t('service', { rate: totals.serviceRate })}</span>
                <span className="tabular-nums">
                  {formatCurrencyAmount(totals.service, currency, { locale: currencyLocale })}
                </span>
              </div>
            )}
            {totals.deliveryFee > 0 && (
              <div className="text-muted-foreground flex justify-between text-sm">
                <span>{t('deliveryFee')}</span>
                <span className="tabular-nums">
                  {formatCurrencyAmount(totals.deliveryFee, currency, { locale: currencyLocale })}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-[var(--menu-line)] pt-3 text-base font-bold">
              <span>{t('total')}</span>
              <span className="font-heading text-lg font-semibold tabular-nums text-[var(--menu-wine)]">
                {formatCurrencyAmount(totals.total, currency, { locale: currencyLocale })}
              </span>
            </div>
            {prepMinutes > 0 && (
              <p className="text-muted-foreground text-xs">
                {t('prepEta', { minutes: prepMinutes })}
              </p>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="font-heading font-semibold">{t('yourDetails')}</h2>
            {isTakeaway && fulfillmentOptions.length > 1 && (
              <div className="space-y-3">
                <Label>{t('fulfillmentType')}</Label>
                <div
                  className="grid grid-cols-2 gap-3"
                  role="radiogroup"
                  aria-label={t('fulfillmentType')}
                >
                  {(
                    [
                      { value: 'pickup', icon: Store, label: t('pickup') },
                      { value: 'delivery', icon: Truck, label: t('delivery') },
                    ] as const
                  )
                    .filter(({ value }) => fulfillmentOptions.includes(value))
                    .map(({ value, icon: Icon, label }) => {
                      const selected = fulfillmentType === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          data-testid={`checkout-fulfillment-${value}`}
                          onClick={() =>
                            setMeta({
                              fulfillmentType: value as FulfillmentType,
                              ...(value === 'pickup'
                                ? {
                                    deliveryLocationId: null,
                                    deliveryAddressDetails: '',
                                    deliveryAddress: '',
                                  }
                                : {}),
                            })
                          }
                          className={cn(
                            'flex min-h-14 flex-col items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition-colors',
                            selected
                              ? 'border-[var(--menu-wine)] bg-[var(--menu-wine-wash)] text-[var(--menu-wine)]'
                              : 'border-[var(--menu-line-strong)] bg-[var(--menu-surface)] text-[var(--menu-ink-soft)] hover:border-[var(--menu-gold-soft)] hover:text-[var(--menu-ink)]'
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          <span>{label}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {requiresDelivery && (
              <div className="space-y-3">
                {noActiveLocations ? (
                  <div
                    role="alert"
                    className="bg-destructive/10 text-destructive rounded-md p-3 text-sm"
                  >
                    {t('noDeliveryLocations')}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="delivery-location">
                        {t('deliveryLocation')} <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={deliveryLocationId ?? ''}
                        onValueChange={(value) => setMeta({ deliveryLocationId: value || null })}
                      >
                        <SelectTrigger
                          id="delivery-location"
                          className="h-11 min-h-11 w-full"
                          data-testid="checkout-location"
                        >
                          <SelectValue placeholder={t('deliveryLocationPlaceholder')}>
                            {selectedLocation
                              ? formatDeliveryLocationOption(
                                  locale,
                                  selectedLocation,
                                  currency,
                                  currencyLocale
                                )
                              : ''}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {(deliveryLocations ?? []).map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {formatDeliveryLocationOption(
                                locale,
                                location,
                                currency,
                                currencyLocale
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="delivery-details">{t('deliveryDetails')}</Label>
                      <Textarea
                        id="delivery-details"
                        value={deliveryAddressDetails}
                        placeholder={t('deliveryDetailsPlaceholder')}
                        onChange={(e) => setMeta({ deliveryAddressDetails: e.target.value })}
                        rows={3}
                        data-testid="checkout-address-details"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="customer-name">
                {t('customerName')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customer-name"
                name="name"
                autoComplete="name"
                required
                value={customerName}
                placeholder={t('customerNamePlaceholder')}
                onChange={(e) => setMeta({ customerName: e.target.value })}
                data-testid="checkout-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">{t('customerPhone')}</Label>
              <div className="flex gap-2">
                <span
                  className="bg-muted text-muted-foreground inline-flex min-h-11 shrink-0 items-center rounded-md border px-3 text-sm font-medium tabular-nums"
                  aria-label={t('detectedCountry', {
                    country: detectedDial.countryName,
                    prefix: detectedDial.prefix,
                  })}
                >
                  {detectedDial.prefix}
                </span>
                <Input
                  id="customer-phone"
                  name="tel-local"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  className="min-w-0 flex-1"
                  value={customerPhone}
                  placeholder={t('customerPhonePlaceholder')}
                  onChange={(e) =>
                    setMeta({ customerPhone: e.target.value.replace(/[^\d\s-]/g, '') })
                  }
                />
              </div>
              {detectedDial.ready ? (
                <p className="text-muted-foreground text-xs">
                  {t('detectedCountry', {
                    country: detectedDial.countryName,
                    prefix: detectedDial.prefix,
                  })}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="order-notes">{t('orderNotes')}</Label>
              <Textarea
                id="order-notes"
                value={orderNotes}
                maxLength={maxNotes}
                placeholder={t('orderNotesPlaceholder')}
                onChange={(e) => setMeta({ orderNotes: e.target.value })}
                rows={3}
              />
              <p className="text-muted-foreground text-xs tabular-nums">
                {orderNotes.length}/{maxNotes}
              </p>
            </div>
          </section>

          <p className="text-muted-foreground text-center text-sm leading-relaxed" role="status">
            {dashboardOrders ? (
              <>
                {t('outcomeSaveOrder')}
                {whatsappConfigured ? ` ${t('outcomeThenWhatsApp')}` : null}
              </>
            ) : whatsappConfigured ? (
              t('outcomeWhatsAppOnly')
            ) : (
              t('whatsappMissing')
            )}
          </p>

          <Button
            size="lg"
            className="h-14 w-full rounded-full bg-[var(--menu-wine)] text-base font-semibold text-[#FDF7F0] hover:bg-[var(--menu-wine-deep)]"
            disabled={
              submitting ||
              orderingBlocked ||
              noActiveLocations ||
              (!dashboardOrders && !whatsappConfigured)
            }
            onClick={handleConfirm}
            data-testid="checkout-confirm"
          >
            {whatsappConfigured ? (
              <MessageCircle className="me-2 h-5 w-5" aria-hidden="true" />
            ) : null}
            {submitting
              ? dashboardOrders
                ? t('placingOrder')
                : t('confirming')
              : whatsappConfigured
                ? t('confirmWhatsApp')
                : t('placeOrder')}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
