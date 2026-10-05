'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageCircle, Truck, Store } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Image } from '@/components/shared/Image';
import { MenuThemeScope } from '@/components/menu/MenuThemeScope';
import { useCartStore, type FulfillmentType } from '@/stores/cart-store';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { fadeInUp } from '@/lib/motion';
import { getName, cn } from '@/lib/utils';
import { calculateOrderTotals, getCartLineUnitPrice } from '@/lib/order/totals';
import {
  formatCurrencyAmount,
  formatCurrencyNumber,
  getRestaurantCurrency,
} from '@/lib/order/format-currency';
import { validateOrder } from '@/lib/order/validation';
import { buildOrderPayload, openWhatsAppUrl } from '@/lib/order/build-order';
import {
  trackCheckoutStart,
  trackDiningOrder,
  trackTakeawayOrder,
  trackOrderWhatsApp,
} from '@/lib/analytics';
import { normalizeWhatsAppPhone } from '@/lib/order/whatsapp-url';
import { useDeliveryLocations } from '@/hooks/useDeliveryLocations';
import {
  buildDeliveryAddressSnapshot,
  formatDeliveryLocationOption,
} from '@/lib/order/delivery-location';
import { formatPrepTimeEta, resolvePrepTimeDisplay } from '@/lib/order/prep-time';
import { isEcommerceStore, showDiningModeToggle } from '@/lib/store-config';
import { instapayHandle, showInstapayDeliveryPrepay } from '@/lib/payment/instapay';
import {
  generateOrderPaymentRef,
  isValidInstapayReference,
  normalizeInstapayReference,
} from '@/lib/payment/instapay-proof';
import { InstapayDeliverySection } from '@/components/checkout/InstapayDeliverySection';

export default function CheckoutPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const t = useTranslations('checkout');
  const tMenu = useTranslations('menu');
  const tCommon = useTranslations('common');
  const prefersReducedMotion = useReducedMotion();
  const { data: settings, isLoading } = useRestaurantSettings();

  const items = useCartStore((s) => s.items);
  const diningMode = useCartStore((s) => s.diningMode);
  const tableNumber = useCartStore((s) => s.tableNumber);
  const fulfillmentType = useCartStore((s) => s.fulfillmentType);
  const deliveryAddress = useCartStore((s) => s.deliveryAddress);
  const deliveryLocationId = useCartStore((s) => s.deliveryLocationId);
  const deliveryAddressDetails = useCartStore((s) => s.deliveryAddressDetails);
  const customerName = useCartStore((s) => s.customerName);
  const customerPhone = useCartStore((s) => s.customerPhone);
  const orderNotes = useCartStore((s) => s.orderNotes);
  const setMeta = useCartStore((s) => s.setMeta);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [trackedStart, setTrackedStart] = useState(false);
  const [instapayProofReference, setInstapayProofReference] = useState('');
  const [instapayScreenshotUrl, setInstapayScreenshotUrl] = useState<string | null>(null);
  const [instapayAmountNote, setInstapayAmountNote] = useState('');
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [referenceDuplicate, setReferenceDuplicate] = useState(false);
  const [checkingReference, setCheckingReference] = useState(false);
  const [orderPaymentRef, setOrderPaymentRef] = useState<string | null>(null);

  const currency = getRestaurantCurrency(settings?.currency);
  const currencyLocale = locale === 'ar' ? 'ar' : 'en';
  const maxNotes = settings?.max_order_notes_length ?? 200;
  const whatsappConfigured = Boolean(normalizeWhatsAppPhone(settings?.whatsapp || ''));
  const isTakeaway = isEcommerceStore || diningMode === 'takeaway';
  const requiresDelivery = isEcommerceStore || (isTakeaway && fulfillmentType === 'delivery');
  const requiresDeliveryAddress = !isEcommerceStore && requiresDelivery;
  const requiresDeliveryLocation = isEcommerceStore;
  const requiresCustomerPhone = isEcommerceStore;
  const { data: deliveryLocations, isLoading: locationsLoading } = useDeliveryLocations();

  const selectedLocation = useMemo(
    () => deliveryLocations?.find((loc) => loc.id === deliveryLocationId) ?? null,
    [deliveryLocations, deliveryLocationId]
  );

  const deliveryFee =
    requiresDelivery && selectedLocation ? Number(selectedLocation.delivery_fee) : 0;

  const composedDeliveryAddress = useMemo(() => {
    if (!requiresDelivery || !selectedLocation) return null;
    return buildDeliveryAddressSnapshot(locale, selectedLocation, deliveryAddressDetails);
  }, [requiresDelivery, selectedLocation, deliveryAddressDetails, locale]);

  const noActiveLocations =
    requiresDeliveryLocation && !locationsLoading && (deliveryLocations?.length ?? 0) === 0;

  const pricedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        unitPrice: getCartLineUnitPrice(
          {
            dining_price: item.dining_price,
            takeaway_price: item.takeaway_price,
            has_size_options: item.has_size_options ?? false,
            sizeOption: item.sizeOption ?? null,
            price_per_kg: item.price_per_kg,
            weightGrams: item.weightGrams,
          },
          diningMode
        ),
      })),
    [items, diningMode]
  );

  const totals = useMemo(
    () =>
      calculateOrderTotals(
        pricedItems.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })),
        settings,
        deliveryFee
      ),
    [pricedItems, settings, deliveryFee]
  );

  const prepTime = useMemo(() => resolvePrepTimeDisplay(settings), [settings]);

  const requiresInstapayProof =
    showInstapayDeliveryPrepay && totals.deliveryFee > 0 && Boolean(deliveryLocationId);

  const referenceFormatValid = isValidInstapayReference(instapayProofReference);
  const proofValid =
    referenceFormatValid && !referenceDuplicate && !checkingReference && !uploadingScreenshot;

  useEffect(() => {
    if (!deliveryLocationId || totals.deliveryFee <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when zone cleared
      setOrderPaymentRef(null);
      setInstapayProofReference('');
      setInstapayScreenshotUrl(null);
      setInstapayAmountNote('');
      return;
    }

    setOrderPaymentRef(generateOrderPaymentRef());
    setInstapayProofReference('');
    setInstapayScreenshotUrl(null);
    setInstapayAmountNote('');
  }, [deliveryLocationId, totals.deliveryFee]);

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
          return isEcommerceStore ? t('whatsappMissingStore') : t('whatsappMissing');
        case 'name_required':
          return t('nameRequired');
        case 'phone_required':
          return t('phoneRequired');
        case 'address_required':
          return t('addressRequired');
        case 'min_order':
          return t('minOrder', {
            amount: formatCurrencyNumber(settings?.minimum_order ?? 0, currencyLocale),
            currency,
          });
        case 'notes_too_long':
          return t('notesTooLong', { max: maxNotes });
        case 'instapay_proof_required':
          return t('instapayReferenceRequired');
        case 'instapay_reference_invalid':
          return t('instapayReferenceInvalid');
        default:
          return tCommon('error');
      }
    });
  };

  const handleConfirm = async () => {
    const result = validateOrder({
      customerName,
      customerPhone,
      requiresCustomerPhone,
      orderNotes,
      itemNotes: items.map((i) => i.notes),
      subtotal: totals.subtotal,
      minimumOrder: settings?.minimum_order ?? 0,
      maxOrderNotesLength: maxNotes,
      whatsappConfigured,
      hasItems: items.length > 0,
      requiresDeliveryAddress,
      deliveryAddress,
      requiresDeliveryLocation,
      deliveryLocationId,
      requiresInstapayProof,
      instapayProofReference,
      instapayScreenshotUrl,
    });

    if (!result.valid) {
      setErrors(resolveErrors(result.codes));
      return;
    }

    if (!settings) return;

    setSubmitting(true);
    setErrors([]);

    try {
      if (!isEcommerceStore) {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items.map((item) => ({
              product_id: item.productId,
              quantity: item.quantity,
              size_option: item.has_size_options ? (item.sizeOption ?? null) : null,
              weight_grams: item.weightGrams ?? null,
              notes: item.notes || null,
            })),
            dining_mode: diningMode,
            fulfillment_type: isTakeaway ? fulfillmentType : null,
            table_number: tableNumber,
            customer_name: customerName.trim(),
            customer_phone: customerPhone.trim() || null,
            delivery_address: requiresDeliveryAddress ? deliveryAddress || null : null,
            delivery_location_id: requiresDeliveryLocation ? deliveryLocationId : null,
            delivery_address_details: requiresDeliveryLocation
              ? deliveryAddressDetails || null
              : null,
            notes: orderNotes || null,
            locale: locale === 'ar' ? 'ar' : 'en',
            whatsapp_sent: true,
          }),
        });

        const payload = (await response.json().catch(() => null)) as {
          order_number?: string;
          code?: string;
        } | null;

        if (!response.ok && payload?.code !== 'feature_disabled') {
          const code = payload?.code;
          const message =
            code === 'product_unavailable'
              ? t('productUnavailable')
              : code === 'orders_closed'
                ? t('ordersClosed')
                : code === 'min_order'
                  ? t('minOrder', {
                      amount: formatCurrencyNumber(settings.minimum_order ?? 0, currencyLocale),
                      currency,
                    })
                  : code === 'address_required'
                    ? t('addressRequired')
                    : t('placeFailed');
          setErrors([message]);
          setSubmitting(false);
          return;
        }
      }

      if (requiresInstapayProof && orderPaymentRef) {
        const proofForm = new FormData();
        proofForm.append('orderRef', orderPaymentRef);
        proofForm.append('customerName', customerName.trim());
        proofForm.append('customerPhone', customerPhone.trim());
        proofForm.append('deliveryFee', String(deliveryFee));
        if (deliveryLocationId) proofForm.append('deliveryLocationId', deliveryLocationId);
        proofForm.append('proofReference', normalizeInstapayReference(instapayProofReference));
        if (instapayScreenshotUrl) proofForm.append('screenshotUrl', instapayScreenshotUrl);
        if (instapayAmountNote.trim()) proofForm.append('amountNote', instapayAmountNote.trim());
        proofForm.append('markWhatsAppSent', 'true');

        const proofResponse = await fetch('/api/instapay-proofs', {
          method: 'POST',
          body: proofForm,
        });
        if (!proofResponse.ok) {
          const proofPayload = (await proofResponse.json().catch(() => null)) as {
            code?: string;
          } | null;
          const message =
            proofPayload?.code === 'instapay_reference_duplicate'
              ? t('instapayReferenceDuplicate')
              : proofPayload?.code === 'instapay_reference_invalid'
                ? t('instapayReferenceInvalid')
                : t('instapayProofSaveFailed');
          setErrors([message]);
          setSubmitting(false);
          return;
        }
      }

      const built = buildOrderPayload({
        items,
        diningMode,
        tableNumber,
        fulfillmentType: isEcommerceStore ? 'delivery' : isTakeaway ? fulfillmentType : null,
        deliveryAddress:
          requiresDeliveryLocation || requiresDeliveryAddress
            ? (composedDeliveryAddress ?? (requiresDeliveryAddress ? deliveryAddress : null))
            : null,
        deliveryFee,
        customerName,
        customerPhone,
        orderNotes,
        orderPaymentRef: requiresInstapayProof ? orderPaymentRef : null,
        instapayProofReference: requiresInstapayProof
          ? normalizeInstapayReference(instapayProofReference)
          : null,
        instapayScreenshotUrl: requiresInstapayProof ? instapayScreenshotUrl : null,
        instapayHandle: requiresInstapayProof ? instapayHandle : null,
        requiresInstapayProof,
        locale: locale === 'ar' ? 'ar' : 'en',
        settings: {
          whatsapp: settings.whatsapp,
          currency: getRestaurantCurrency(settings.currency),
          tax_rate: settings.tax_rate,
          service_charge_rate: settings.service_charge_rate,
          apply_tax: settings.apply_tax,
          apply_service_charge: settings.apply_service_charge,
          prep_time_minutes: settings.prep_time_minutes ?? 25,
          prep_time_days: settings.prep_time_days,
        },
      });

      if (diningMode === 'dining') trackDiningOrder();
      else trackTakeawayOrder();

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
      router.push('/order-success?sent=1');
    } catch {
      setErrors([isEcommerceStore ? t('whatsappMissingStore') : t('whatsappMissing')]);
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
              href="/menu"
              aria-label={t('backToMenu')}
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'h-11 w-11')}
            >
              <ArrowLeft className={cn('h-5 w-5', locale === 'ar' && 'rotate-180')} />
            </Link>
            <div className="flex min-w-0 items-center gap-3">
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
          </div>

          {!whatsappConfigured && (
            <div role="alert" className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {isEcommerceStore ? t('whatsappMissingStore') : t('whatsappMissing')}
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
              {showDiningModeToggle && (
                <Badge variant="secondary">
                  {diningMode === 'dining' ? t('dining') : t('takeaway')}
                </Badge>
              )}
              {tableNumber && (
                <Badge variant="outline">
                  {t('table')} {tableNumber}
                </Badge>
              )}
            </div>

            <ul className="space-y-3">
              {pricedItems.map((item) => {
                const name = getName(locale, item.name_en, item.name_ar);
                return (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 text-sm"
                    data-testid="checkout-line"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        <span className="tabular-nums">{item.quantity}×</span> {name}
                      </p>
                      {item.weightGrams != null ? (
                        <p className="text-muted-foreground">
                          {tMenu('grams', { grams: item.weightGrams })}
                        </p>
                      ) : null}
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
          </section>

          <section className="space-y-3 rounded-xl border border-[var(--menu-line)] bg-[var(--menu-surface)] p-4">
            <div className="flex justify-between text-sm">
              <span>{t('subtotal')}</span>
              <span className="tabular-nums">
                {formatCurrencyAmount(totals.subtotal, currency, { locale: currencyLocale })}
              </span>
            </div>
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
            {prepTime && (
              <p className="text-muted-foreground text-xs">
                {formatPrepTimeEta(prepTime, {
                  days: (count) => t('prepEtaDays', { days: count }),
                  minutes: (count) => t('prepEta', { minutes: count }),
                })}
              </p>
            )}
          </section>

          {requiresDeliveryLocation && (
            <section className="space-y-4">
              <h2 className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                {t('checkoutStepDelivery')}
              </h2>
              {locationsLoading ? (
                <Skeleton className="h-11 w-full rounded-md" />
              ) : noActiveLocations ? (
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
                      rows={2}
                      data-testid="checkout-address-details"
                    />
                  </div>
                </>
              )}
            </section>
          )}

          {requiresInstapayProof && orderPaymentRef && (
            <section className="space-y-3">
              <h2 className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                {t('checkoutStepInstapay')}
              </h2>
              <InstapayDeliverySection
                deliveryFee={totals.deliveryFee}
                currency={currency}
                currencyLocale={currencyLocale}
                orderPaymentRef={orderPaymentRef}
                proofReference={instapayProofReference}
                screenshotUrl={instapayScreenshotUrl}
                amountNote={instapayAmountNote}
                onProofReferenceChange={setInstapayProofReference}
                onScreenshotUrlChange={setInstapayScreenshotUrl}
                onAmountNoteChange={setInstapayAmountNote}
                onUploadingChange={setUploadingScreenshot}
                onReferenceStatusChange={({ duplicate, checking }) => {
                  setReferenceDuplicate(duplicate);
                  setCheckingReference(checking);
                }}
              />
            </section>
          )}

          <section className="space-y-4">
            {(requiresDeliveryLocation || isTakeaway || requiresDeliveryAddress) && (
              <h2 className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                {t('checkoutStepDetails')}
              </h2>
            )}

            {isTakeaway && !isEcommerceStore && (
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
                  ).map(({ value, icon: Icon, label }) => {
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
              <Label htmlFor="customer-phone">
                {isEcommerceStore ? t('customerPhoneRequired') : t('customerPhone')}
                {isEcommerceStore && <span className="text-destructive"> *</span>}
              </Label>
              <Input
                id="customer-phone"
                name="tel"
                type="tel"
                autoComplete="tel"
                required={isEcommerceStore}
                value={customerPhone}
                placeholder={t('customerPhonePlaceholder')}
                onChange={(e) => setMeta({ customerPhone: e.target.value })}
                data-testid="checkout-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order-notes">
                {isEcommerceStore ? t('orderNotesStore') : t('orderNotes')}
              </Label>
              <Textarea
                id="order-notes"
                value={orderNotes}
                maxLength={maxNotes}
                placeholder={
                  isEcommerceStore ? t('orderNotesPlaceholderStore') : t('orderNotesPlaceholder')
                }
                onChange={(e) => setMeta({ orderNotes: e.target.value })}
                rows={3}
              />
              <p className="text-muted-foreground text-xs tabular-nums">
                {orderNotes.length}/{maxNotes}
              </p>
            </div>
          </section>

          {requiresInstapayProof && !proofValid && (
            <p className="text-muted-foreground text-center text-xs">{t('instapayConfirmHint')}</p>
          )}

          <Button
            size="lg"
            className="h-14 w-full rounded-full bg-[var(--menu-wine)] text-base font-semibold text-[#FDF7F0] hover:bg-[var(--menu-wine-deep)]"
            disabled={
              submitting ||
              !whatsappConfigured ||
              noActiveLocations ||
              (requiresInstapayProof && !proofValid)
            }
            onClick={handleConfirm}
            data-testid="checkout-confirm"
          >
            <MessageCircle className="me-2 h-5 w-5" aria-hidden="true" />
            {submitting ? t('confirming') : t('confirmWhatsApp')}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
