'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageCircle, ShoppingBag, Truck, Store } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { CheckoutCoupon, type AppliedCoupon } from '@/components/checkout/CheckoutCoupon';
import { couponErrorMessageKey, isCouponErrorCode } from '@/lib/order/coupon-errors';
import {
  formatCurrencyAmount,
  formatCurrencyNumber,
  getRestaurantCurrency,
  toCurrencyLocale,
} from '@/lib/order/format-currency';
import { validateOrder } from '@/lib/order/validation';
import { buildOrderPayload, openWhatsAppUrl } from '@/lib/order/build-order';
import {
  trackCheckoutStart,
  trackDiningOrder,
  trackTakeawayOrder,
  trackOrderWhatsApp,
} from '@/lib/analytics';
import { haptic } from '@/lib/haptics';
import { normalizeWhatsAppPhone } from '@/lib/order/whatsapp-url';
import { useDetectedDialCode } from '@/hooks/useDetectedDialCode';
import { normalizeLocalPhone, formatDisplayPhone } from '@/lib/phone/normalize';
import { getFulfillmentOptions, resolveOrderModes } from '@/lib/order/order-modes';
import { writeLastOrder } from '@/lib/order/last-order';

export default function CheckoutPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const t = useTranslations('checkout');
  const tCart = useTranslations('cart');
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
  const deliveryAddress = useCartStore((s) => s.deliveryAddress);
  const customerName = useCartStore((s) => s.customerName);
  const customerPhone = useCartStore((s) => s.customerPhone);
  const orderNotes = useCartStore((s) => s.orderNotes);
  const setMeta = useCartStore((s) => s.setMeta);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [trackedStart, setTrackedStart] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const currency = getRestaurantCurrency(settings?.currency);
  const currencyLocale = toCurrencyLocale(locale);
  const orderModes = useMemo(() => resolveOrderModes(settings), [settings]);
  const fulfillmentOptions = useMemo(() => getFulfillmentOptions(orderModes), [orderModes]);
  const detectedDial = useDetectedDialCode(locale, { currency: settings?.currency });
  const maxNotes = settings?.max_order_notes_length ?? 200;
  const whatsappConfigured = Boolean(normalizeWhatsAppPhone(settings?.whatsapp || ''));
  const isTakeaway = diningMode === 'takeaway';
  const requiresDeliveryAddress = isTakeaway && fulfillmentType === 'delivery';
  const requireWhatsApp = !dashboardOrders;

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
        ...(fallback === 'pickup' ? { deliveryAddress: '' } : {}),
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

  const localTotals = useMemo(
    () =>
      calculateOrderTotals(
        pricedItems.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })),
        settings
      ),
    [pricedItems, settings]
  );

  const totals = appliedCoupon
    ? {
        ...localTotals,
        subtotal: appliedCoupon.subtotal,
        discount: appliedCoupon.discountAmount,
        tax: appliedCoupon.tax,
        service: appliedCoupon.service,
        total: appliedCoupon.total,
      }
    : localTotals;

  const previewItems = useMemo(
    () =>
      items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        size_option: item.has_size_options ? item.sizeOption : null,
        notes: item.notes || null,
      })),
    [items]
  );

  const handleCouponApplied = useCallback((coupon: AppliedCoupon) => {
    setAppliedCoupon(coupon);
  }, []);

  const handleCouponRemoved = useCallback(() => {
    setAppliedCoupon(null);
  }, []);

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
            amount: formatCurrencyNumber(settings?.minimum_order ?? 0, currencyLocale),
            currency,
          });
        case 'notes_too_long':
          return t('notesTooLong', { max: maxNotes });
        default:
          return tCommon('error');
      }
    });
  };

  const handleConfirm = async () => {
    const result = validateOrder({
      customerName,
      orderNotes,
      itemNotes: items.map((i) => i.notes),
      subtotal: totals.subtotal,
      minimumOrder: settings?.minimum_order ?? 0,
      maxOrderNotesLength: maxNotes,
      whatsappConfigured,
      requireWhatsApp,
      hasItems: items.length > 0,
      requiresDeliveryAddress,
      deliveryAddress,
    });

    if (!result.valid) {
      setErrors(resolveErrors(result.codes));
      return;
    }

    if (!settings) return;

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
              notes: item.notes || null,
            })),
            dining_mode: diningMode,
            fulfillment_type: isTakeaway ? fulfillmentType : null,
            table_number: tableNumber,
            customer_name: customerName,
            customer_phone: normalizedPhone,
            phone_country: detectedDial.country,
            delivery_address: requiresDeliveryAddress ? deliveryAddress : null,
            notes: orderNotes || null,
            locale: toCurrencyLocale(locale),
            whatsapp_sent: sendWhatsApp,
            coupon_code: appliedCoupon?.code ?? null,
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
          if (code === 'rate_limited') setErrors([t('rateLimited')]);
          else if (code === 'product_unavailable') setErrors([t('productUnavailable')]);
          else if (code === 'feature_disabled') setErrors([t('boardUnavailable')]);
          else if (code === 'min_order') {
            setErrors(
              appliedCoupon
                ? [t('couponMinOrder')]
                : [
                    t('minOrder', {
                      amount: formatCurrencyNumber(settings?.minimum_order ?? 0, currencyLocale),
                      currency,
                    }),
                  ]
            );
          } else if (isCouponErrorCode(code)) {
            setErrors([t(couponErrorMessageKey(code))]);
            setAppliedCoupon(null);
          } else setErrors([t('placeFailed')]);
          setSubmitting(false);
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
        });
      }

      const built = sendWhatsApp
        ? buildOrderPayload({
            items,
            diningMode,
            tableNumber,
            fulfillmentType: isTakeaway ? fulfillmentType : null,
            deliveryAddress: requiresDeliveryAddress ? deliveryAddress : null,
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
              appliedCoupon && appliedCoupon.discountType
                ? {
                    type: appliedCoupon.discountType,
                    value: appliedCoupon.discountValue ?? 0,
                  }
                : null,
            couponCode: appliedCoupon?.code ?? null,
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
        } catch {
          // ignore
        }

        openWhatsAppUrl(built.whatsappUrl);
      }

      const params = new URLSearchParams();
      if (built) params.set('sent', '1');
      if (orderNumber) params.set('order', orderNumber);
      haptic.success();
      router.push(`/order-success${params.size ? `?${params.toString()}` : ''}`);
    } catch {
      setErrors([dashboardOrders ? t('placeFailed') : t('whatsappMissing')]);
      setSubmitting(false);
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
            </div>
          )}

          <section className="space-y-3">
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
              applied={appliedCoupon}
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
            {totals.discount > 0 && (
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
            )}
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
                              ...(value === 'pickup' ? { deliveryAddress: '' } : {}),
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

            {requiresDeliveryAddress && (
              <div className="space-y-2">
                <Label htmlFor="delivery-address">
                  {t('deliveryAddress')} <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="delivery-address"
                  required
                  value={deliveryAddress}
                  placeholder={t('deliveryAddressPlaceholder')}
                  onChange={(e) => setMeta({ deliveryAddress: e.target.value })}
                  rows={3}
                  data-testid="checkout-address"
                />
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
            disabled={submitting || (!dashboardOrders && !whatsappConfigured)}
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
