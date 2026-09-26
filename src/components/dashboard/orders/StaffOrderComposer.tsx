'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, Search, Store, Truck, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Image } from '@/components/shared/Image';
import {
  CheckoutCoupon,
  previewCheckoutDiscounts,
  type AppliedCoupon,
} from '@/components/checkout/CheckoutCoupon';
import { OrderReceipt } from '@/components/dashboard/orders/OrderReceipt';
import {
  StaffProductPickerPanel,
  type StaffPendingProduct,
  type StaffSizeOption,
} from '@/components/dashboard/orders/StaffProductPickerPanel';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useDeliveryLocations } from '@/hooks/useDeliveryLocations';
import {
  fetchStaffOrderForReceipt,
  usePlaceStaffOrder,
  useStaffOrderCatalog,
  type StaffCatalogProduct,
} from '@/hooks/useStaffOrder';
import { useFeatureSettings, useRestaurantSettings } from '@/hooks/useSettings';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { hasDailyOps } from '@/i18n/config';
import { formatDeliveryLocationOption } from '@/lib/order/delivery-location';
import {
  formatCurrencyAmount,
  getRestaurantCurrency,
  toCurrencyLocale,
} from '@/lib/order/format-currency';
import { PaymentClosePanel } from '@/components/dashboard/orders/PaymentClosePanel';
import { printReceiptElement, receiptDomId } from '@/lib/order/print-receipt';
import { calculateOrderTotals, getCartLineUnitPrice, type DiningMode } from '@/lib/order/totals';
import {
  getDefaultProductSize,
  getEnabledProductSizes,
  getSizeLabel,
  type ProductSizeId,
} from '@/lib/catalog/product-sizes';
import { computeWeightPrice, hasWeightOptions } from '@/lib/order/weight-price';
import { cn, getName } from '@/lib/utils';
import type { OrderWithItems } from '@/types/database';
import type { StaffPlaceOrderInput } from '@/types/schema';

type FulfillmentType = 'pickup' | 'delivery';
type SizeOption = ProductSizeId;
type MobilePane = 'catalog' | 'ticket';

interface StaffTicketLine {
  lineId: string;
  productId: string;
  name_ar: string;
  name_en: string;
  name_fr: string | null;
  name_nl: string | null;
  image_url: string | null;
  dining_price: number;
  takeaway_price: number;
  has_size_options: boolean;
  price_medium?: number | null;
  price_family?: number | null;
  size_small_enabled?: boolean | null;
  size_medium_enabled?: boolean | null;
  size_large_enabled?: boolean | null;
  size_family_enabled?: boolean | null;
  price_per_kg: number | null;
  quantity: number;
  sizeOption: SizeOption | null;
  weightGrams: number | null;
  notes: string;
}

interface StaffOrderComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function makeStaffLineId(
  productId: string,
  sizeOption: SizeOption | null,
  weightGrams: number | null,
  notes: string
): string {
  const parts = [productId];
  if (sizeOption) parts.push(sizeOption);
  if (weightGrams != null) parts.push(String(weightGrams));
  const noteKey = notes.trim().toLowerCase();
  if (noteKey) parts.push(noteKey);
  return parts.join('::');
}

function getStaffLineUnitPrice(line: StaffTicketLine, diningMode: DiningMode): number {
  if (line.weightGrams != null && line.price_per_kg != null) {
    return computeWeightPrice(line.price_per_kg, line.weightGrams);
  }
  return getCartLineUnitPrice(
    {
      dining_price: line.dining_price,
      takeaway_price: line.takeaway_price,
      price_medium: line.price_medium,
      price_family: line.price_family,
      size_small_enabled: line.size_small_enabled,
      size_medium_enabled: line.size_medium_enabled,
      size_large_enabled: line.size_large_enabled,
      size_family_enabled: line.size_family_enabled,
      has_size_options: line.has_size_options,
      sizeOption: line.sizeOption,
    },
    diningMode
  );
}

function productFromCatalog(
  product: StaffCatalogProduct,
  partial: Partial<StaffTicketLine>
): StaffTicketLine {
  return {
    lineId: makeStaffLineId(
      product.id,
      partial.sizeOption ?? null,
      partial.weightGrams ?? null,
      partial.notes ?? ''
    ),
    productId: product.id,
    name_ar: product.name_ar,
    name_en: product.name_en,
    name_fr: product.name_fr,
    name_nl: product.name_nl,
    image_url: product.image_url,
    dining_price: Number(product.dining_price),
    takeaway_price: Number(product.takeaway_price),
    price_medium: product.price_medium != null ? Number(product.price_medium) : null,
    price_family: product.price_family != null ? Number(product.price_family) : null,
    size_small_enabled: product.size_small_enabled,
    size_medium_enabled: product.size_medium_enabled,
    size_large_enabled: product.size_large_enabled,
    size_family_enabled: product.size_family_enabled,
    has_size_options: getEnabledProductSizes(product).length > 0,
    price_per_kg: product.price_per_kg != null ? Number(product.price_per_kg) : null,
    quantity: partial.quantity ?? 1,
    sizeOption: partial.sizeOption ?? null,
    weightGrams: partial.weightGrams ?? null,
    notes: partial.notes ?? '',
  };
}

export function StaffOrderComposer({ open, onOpenChange }: StaffOrderComposerProps) {
  const isDesktop = useIsDesktop();
  const { locale } = useI18n();
  const t = useTranslations('orders');
  const tCheckout = useTranslations('checkout');
  const tCommon = useTranslations('common');
  const tMenu = useTranslations('menu');
  const tCart = useTranslations('cart');
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: settings } = useRestaurantSettings();
  const { data: features } = useFeatureSettings();
  const { data: catalog, isLoading: catalogLoading } = useStaffOrderCatalog();
  const { data: deliveryLocations, isLoading: locationsLoading } = useDeliveryLocations();
  const placeOrder = usePlaceStaffOrder();

  const couponsEnabled = features?.coupons === true;

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [lines, setLines] = useState<StaffTicketLine[]>([]);
  const [diningMode, setDiningMode] = useState<DiningMode>('dining');
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('pickup');
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryLocationId, setDeliveryLocationId] = useState<string | null>(null);
  const [deliveryAddressDetails, setDeliveryAddressDetails] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [autoDiscount, setAutoDiscount] = useState<AppliedCoupon | null>(null);
  const [pending, setPending] = useState<StaffPendingProduct | null>(null);
  const [printOrder, setPrintOrder] = useState<OrderWithItems | null>(null);
  const [collectOrder, setCollectOrder] = useState<OrderWithItems | null>(null);
  const [mobilePane, setMobilePane] = useState<MobilePane>('catalog');

  const currency = getRestaurantCurrency(settings?.currency);
  const currencyLocale = toCurrencyLocale(locale);
  const isTakeaway = diningMode === 'takeaway';
  const requiresDelivery = isTakeaway && fulfillmentType === 'delivery';

  const resetForm = useCallback(() => {
    setSearch('');
    setCategoryId(null);
    setLines([]);
    setDiningMode('dining');
    setFulfillmentType('pickup');
    setTableNumber('');
    setCustomerName(hasDailyOps ? t('staffWalkInName') : '');
    setCustomerPhone('');
    setDeliveryLocationId(null);
    setDeliveryAddressDetails('');
    setOrderNotes('');
    setAppliedCoupon(null);
    setAutoDiscount(null);
    setPending(null);
    setCollectOrder(null);
    setMobilePane('catalog');
  }, [t]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        if (hasDailyOps) {
          setCustomerName(t('staffWalkInName'));
        }
        requestAnimationFrame(() => searchRef.current?.focus());
      } else {
        if (pending) {
          setPending(null);
          return;
        }
        resetForm();
      }
      onOpenChange(next);
    },
    [onOpenChange, pending, resetForm, t]
  );

  useEffect(() => {
    if (!printOrder) return;
    const el = document.getElementById(receiptDomId(printOrder.id));
    if (!el) return;
    void printReceiptElement(el).finally(() => setPrintOrder(null));
  }, [printOrder]);

  const flatProducts = useMemo(() => {
    const list: Array<StaffCatalogProduct & { categoryId: string }> = [];
    for (const cat of catalog ?? []) {
      for (const product of cat.products ?? []) {
        list.push({ ...product, categoryId: cat.id });
      }
    }
    return list;
  }, [catalog]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return flatProducts.filter((product) => {
      if (categoryId && product.categoryId !== categoryId) return false;
      if (!q) return true;
      const names = [product.name_en, product.name_ar, product.name_fr, product.name_nl]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return names.includes(q);
    });
  }, [flatProducts, categoryId, search]);

  const selectedLocation = useMemo(
    () => deliveryLocations?.find((loc) => loc.id === deliveryLocationId) ?? null,
    [deliveryLocations, deliveryLocationId]
  );

  const deliveryFee =
    requiresDelivery && selectedLocation ? Number(selectedLocation.delivery_fee) : 0;

  const pricedLines = useMemo(
    () =>
      lines.map((line) => ({
        ...line,
        unitPrice: getStaffLineUnitPrice(line, diningMode),
      })),
    [lines, diningMode]
  );

  const previewItems = useMemo(
    () =>
      lines.map((line) => ({
        product_id: line.productId,
        quantity: line.quantity,
        size_option: line.has_size_options ? line.sizeOption : null,
        weight_grams: line.weightGrams,
        notes: line.notes || null,
      })),
    [lines]
  );

  const autoDiscountEligible =
    couponsEnabled && open && !appliedCoupon?.code && previewItems.length > 0;

  useEffect(() => {
    if (!autoDiscountEligible) return;

    let cancelled = false;
    void previewCheckoutDiscounts({
      items: previewItems,
      diningMode,
      customerPhone,
      phoneCountry: 'EG',
      couponCode: null,
    }).then((preview) => {
      if (!cancelled) setAutoDiscount(preview);
    });

    return () => {
      cancelled = true;
    };
  }, [autoDiscountEligible, customerPhone, diningMode, previewItems]);

  const effectiveAutoDiscount = autoDiscountEligible ? autoDiscount : null;

  const localTotals = useMemo(
    () =>
      calculateOrderTotals(
        pricedLines.map((line) => ({ quantity: line.quantity, unitPrice: line.unitPrice })),
        settings,
        null,
        deliveryFee
      ),
    [pricedLines, settings, deliveryFee]
  );

  const previewedDiscount = appliedCoupon ?? effectiveAutoDiscount;
  const totals = previewedDiscount
    ? {
        ...localTotals,
        subtotal: previewedDiscount.subtotal,
        discount: previewedDiscount.discountAmount,
        tax: previewedDiscount.tax,
        service: previewedDiscount.service,
        total: previewedDiscount.total + deliveryFee,
      }
    : localTotals;

  const noActiveLocations =
    requiresDelivery && !locationsLoading && (deliveryLocations?.length ?? 0) === 0;

  const ticketQty = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);

  const addLine = useCallback(
    (
      product: StaffCatalogProduct,
      opts: { sizeOption?: SizeOption | null; weightGrams?: number | null }
    ) => {
      const line = productFromCatalog(product, {
        sizeOption: opts.sizeOption ?? null,
        weightGrams: opts.weightGrams ?? null,
        quantity: 1,
      });
      setLines((prev) => {
        const existing = prev.find((item) => item.lineId === line.lineId);
        if (existing) {
          return prev.map((item) =>
            item.lineId === line.lineId
              ? { ...item, quantity: Math.min(99, item.quantity + 1) }
              : item
          );
        }
        return [...prev, line];
      });
    },
    []
  );

  const handleProductTap = (product: StaffCatalogProduct) => {
    const enabledSizes = getEnabledProductSizes(product);
    const needsSize = enabledSizes.length > 0;
    const needsWeight = hasWeightOptions(product);
    if (needsSize || needsWeight) {
      setPending({
        product,
        selectedSize: needsSize ? getDefaultProductSize(product) : null,
        selectedWeight: needsWeight ? (product.weight_options_g?.[0] ?? null) : null,
      });
      return;
    }
    addLine(product, {});
  };

  const handleConfirmPending = () => {
    if (!pending) return;
    const { product, selectedSize, selectedWeight } = pending;
    const needsSize = getEnabledProductSizes(product).length > 0;
    const needsWeight = hasWeightOptions(product);
    if (needsSize && !selectedSize) return;
    if (needsWeight && selectedWeight == null) return;
    addLine(product, { sizeOption: selectedSize, weightGrams: selectedWeight });
    setPending(null);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    if (filteredProducts.length === 1) {
      event.preventDefault();
      handleProductTap(filteredProducts[0]);
      setSearch('');
    }
  };

  const canSubmit =
    lines.length > 0 &&
    customerName.trim().length > 0 &&
    !noActiveLocations &&
    !(requiresDelivery && !deliveryLocationId) &&
    !placeOrder.isPending;

  const finishCollect = (order: OrderWithItems) => {
    setCollectOrder(null);
    handleOpenChange(false);
    setPrintOrder(order);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const payload: StaffPlaceOrderInput = {
      items: lines.map((line) => ({
        product_id: line.productId,
        quantity: line.quantity,
        size_option: line.has_size_options ? line.sizeOption : null,
        weight_grams: line.weightGrams,
        notes: line.notes || null,
      })),
      dining_mode: diningMode,
      fulfillment_type: isTakeaway ? fulfillmentType : null,
      table_number: !isTakeaway && tableNumber.trim() ? tableNumber.trim() : null,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim() || null,
      delivery_location_id: requiresDelivery ? deliveryLocationId : null,
      delivery_address_details: requiresDelivery ? deliveryAddressDetails.trim() || null : null,
      notes: orderNotes.trim() || null,
      locale: locale as StaffPlaceOrderInput['locale'],
      coupon_code: appliedCoupon?.code ?? null,
    };

    try {
      const result = await placeOrder.mutateAsync(payload);
      toast.success(t('staffOrderSaved', { number: result.order_number }));
      const fullOrder = await fetchStaffOrderForReceipt(result.id);
      if (hasDailyOps) {
        setCollectOrder(fullOrder);
        setMobilePane('ticket');
        return;
      }
      handleOpenChange(false);
      setPrintOrder(fullOrder);
    } catch (err) {
      const code = err instanceof Error ? err.message : 'place_failed';
      const known = [
        'invalid_coupon',
        'min_order',
        'product_unavailable',
        'address_required',
        'name_required',
      ];
      toast.error(known.includes(code) ? tCheckout(code) : tCheckout('placeFailed'));
    }
  };

  const catalogPanel = (
    <div
      className={cn(
        'h-full min-h-0 flex-col gap-2',
        mobilePane === 'catalog' ? 'flex' : 'hidden',
        'md:flex'
      )}
    >
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder={t('staffSearchPlaceholder')}
          className="min-h-11 ps-9"
          aria-label={t('staffSearchPlaceholder')}
        />
      </div>

      <div
        className={cn(
          'gap-1.5',
          hasDailyOps
            ? 'flex max-h-[5.75rem] flex-wrap overflow-y-auto'
            : '-mx-1 flex overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]'
        )}
      >
        <button
          type="button"
          onClick={() => setCategoryId(null)}
          className={cn(
            'focus-visible:ring-ring inline-flex min-h-11 shrink-0 touch-manipulation items-center rounded-full border px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2',
            categoryId === null
              ? 'border-secondary bg-secondary text-secondary-foreground'
              : 'border-border text-muted-foreground'
          )}
        >
          {tMenu('allCategories')}
        </button>
        {(catalog ?? []).map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategoryId(cat.id)}
            className={cn(
              'focus-visible:ring-ring inline-flex min-h-11 shrink-0 touch-manipulation items-center rounded-full border px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2',
              categoryId === cat.id
                ? 'border-secondary bg-secondary text-secondary-foreground'
                : 'border-border text-muted-foreground'
            )}
          >
            {getName(locale, cat.name_en, cat.name_ar, cat.name_fr, cat.name_nl)}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border">
        {pending ? (
          <StaffProductPickerPanel
            pending={pending}
            locale={locale}
            currency={currency}
            currencyLocale={currencyLocale}
            onSizeChange={(size: StaffSizeOption) =>
              setPending((prev) => (prev ? { ...prev, selectedSize: size } : null))
            }
            onWeightChange={(grams) =>
              setPending((prev) => (prev ? { ...prev, selectedWeight: grams } : null))
            }
            onConfirm={handleConfirmPending}
            onCancel={() => setPending(null)}
          />
        ) : catalogLoading ? (
          <p className="text-muted-foreground p-4 text-center text-sm">{tCommon('loading')}</p>
        ) : flatProducts.length === 0 ? (
          <p className="text-muted-foreground p-4 text-center text-sm">{t('staffEmptyCatalog')}</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-muted-foreground p-4 text-center text-sm">{tMenu('noProducts')}</p>
        ) : (
          <ul
            className={cn(
              'grid min-h-0 flex-1 overflow-y-auto',
              hasDailyOps
                ? 'grid-cols-2 gap-2 p-2 sm:grid-cols-3 xl:grid-cols-4'
                : 'grid-cols-1 gap-px p-1 sm:grid-cols-2 xl:grid-cols-3'
            )}
          >
            {filteredProducts.map((product) => {
              const name = getName(
                locale,
                product.name_en,
                product.name_ar,
                product.name_fr,
                product.name_nl
              );
              const weighted = hasWeightOptions(product);
              const previewPrice = weighted
                ? product.weight_options_g?.length
                  ? computeWeightPrice(
                      Number(product.price_per_kg),
                      Math.min(...product.weight_options_g)
                    )
                  : null
                : getCartLineUnitPrice(
                    {
                      dining_price: Number(product.dining_price),
                      takeaway_price: Number(product.takeaway_price),
                      has_size_options: product.has_size_options,
                      sizeOption: product.has_size_options ? 'small' : null,
                    },
                    diningMode
                  );

              if (hasDailyOps) {
                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => handleProductTap(product)}
                      className="hover:bg-muted/60 focus-visible:ring-ring bg-card flex aspect-square min-h-20 w-full touch-manipulation flex-col overflow-hidden rounded-xl border text-start shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 motion-reduce:transition-none"
                    >
                      {product.image_url ? (
                        <div className="relative min-h-0 w-full flex-1 overflow-hidden">
                          <Image
                            src={product.image_url}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 45vw, 160px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="bg-muted min-h-0 w-full flex-1" />
                      )}
                      <div className="shrink-0 border-t px-2 py-1.5">
                        <p className="font-heading line-clamp-2 text-xs font-semibold leading-tight">
                          {name}
                        </p>
                        <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1 text-[0.65rem]">
                          {previewPrice != null ? (
                            <span className="text-foreground font-semibold tabular-nums">
                              {formatCurrencyAmount(previewPrice, currency, {
                                locale: currencyLocale,
                              })}
                            </span>
                          ) : null}
                          {weighted || product.has_size_options ? (
                            <span className="text-secondary font-semibold uppercase tracking-wide">
                              {weighted ? t('staffWeightHint') : t('staffSizeHint')}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              }

              return (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => handleProductTap(product)}
                    className="hover:bg-muted/70 focus-visible:ring-ring flex min-h-11 w-full touch-manipulation items-center gap-2.5 rounded-lg px-2 py-1.5 text-start focus-visible:outline-none focus-visible:ring-2 motion-reduce:transition-none"
                  >
                    {product.image_url ? (
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-md">
                        <Image
                          src={product.image_url}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="bg-muted size-10 shrink-0 rounded-md" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight">{name}</p>
                      <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
                        {previewPrice != null ? (
                          <span className="tabular-nums">
                            {formatCurrencyAmount(previewPrice, currency, {
                              locale: currencyLocale,
                            })}
                            {weighted
                              ? ` · ${t('staffWeightGrams', { grams: product.weight_options_g?.[0] ?? 0 })}`
                              : ''}
                          </span>
                        ) : null}
                        {weighted || product.has_size_options ? (
                          <span className="text-secondary font-semibold uppercase tracking-wide">
                            {weighted ? t('staffWeightHint') : t('staffSizeHint')}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );

  const ticketPanel = (
    <div
      className={cn(
        'bg-card relative h-full min-h-0 flex-col overflow-hidden rounded-xl border',
        mobilePane === 'ticket' ? 'flex' : 'hidden',
        'md:flex'
      )}
    >
      <div aria-hidden="true" className="bg-secondary absolute inset-y-0 start-0 w-1.5" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.08]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, transparent, transparent 27px, currentColor 27px, currentColor 28px)',
        }}
      />

      <div className="relative flex min-h-0 flex-1 flex-col gap-2.5 p-3 ps-4">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setDiningMode('dining')}
            aria-pressed={diningMode === 'dining'}
            className={cn(
              'focus-visible:ring-ring min-h-11 touch-manipulation rounded-lg border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2',
              diningMode === 'dining'
                ? 'border-secondary bg-secondary/10 text-secondary'
                : 'border-border text-muted-foreground'
            )}
          >
            {t('dining')}
          </button>
          <button
            type="button"
            onClick={() => setDiningMode('takeaway')}
            aria-pressed={diningMode === 'takeaway'}
            className={cn(
              'focus-visible:ring-ring min-h-11 touch-manipulation rounded-lg border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2',
              diningMode === 'takeaway'
                ? 'border-secondary bg-secondary/10 text-secondary'
                : 'border-border text-muted-foreground'
            )}
          >
            {t('takeaway')}
          </button>
        </div>

        {isTakeaway ? (
          <div className="grid grid-cols-2 gap-1.5">
            {(['pickup', 'delivery'] as const).map((value) => {
              const Icon = value === 'pickup' ? Store : Truck;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setFulfillmentType(value);
                    if (value === 'pickup') setDeliveryLocationId(null);
                  }}
                  aria-pressed={fulfillmentType === value}
                  className={cn(
                    'focus-visible:ring-ring flex min-h-11 touch-manipulation items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2',
                    fulfillmentType === value
                      ? 'border-secondary bg-secondary/10 text-secondary'
                      : 'border-border text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t(value)}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1">
            <Label htmlFor="staff-table" className="text-xs">
              {t('table')}
            </Label>
            <Input
              id="staff-table"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="5"
              className="min-h-11"
            />
          </div>
        )}

        {requiresDelivery ? (
          <div className="space-y-2">
            {noActiveLocations ? (
              <p className="text-destructive text-sm">{t('staffNoDeliveryLocations')}</p>
            ) : (
              <>
                <div className="space-y-1">
                  <Label htmlFor="staff-delivery-location" className="text-xs">
                    {tCheckout('deliveryLocation')}
                  </Label>
                  <Select
                    value={deliveryLocationId ?? ''}
                    onValueChange={(value) => setDeliveryLocationId(value || null)}
                  >
                    <SelectTrigger id="staff-delivery-location" className="min-h-11 w-full">
                      <SelectValue placeholder={tCheckout('deliveryLocationPlaceholder')}>
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
                          {formatDeliveryLocationOption(locale, location, currency, currencyLocale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="staff-delivery-details" className="text-xs">
                    {tCheckout('deliveryDetails')}
                  </Label>
                  <Textarea
                    id="staff-delivery-details"
                    value={deliveryAddressDetails}
                    onChange={(e) => setDeliveryAddressDetails(e.target.value)}
                    placeholder={tCheckout('deliveryDetailsPlaceholder')}
                    rows={2}
                    className="min-h-11"
                  />
                </div>
              </>
            )}
          </div>
        ) : null}

        <div className="bg-background/70 min-h-0 flex-1 overflow-y-auto rounded-lg border">
          {lines.length === 0 ? (
            <p className="text-muted-foreground p-6 text-center text-sm">{t('staffEmptyTicket')}</p>
          ) : (
            <ul>
              {pricedLines.map((line) => {
                const name = getName(
                  locale,
                  line.name_en,
                  line.name_ar,
                  line.name_fr,
                  line.name_nl
                );
                const optionLabel = [
                  line.sizeOption ? getSizeLabel(locale, line.sizeOption) : null,
                  line.weightGrams != null ? tMenu('grams', { grams: line.weightGrams }) : null,
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <li
                    key={line.lineId}
                    className="hover:bg-muted/50 flex flex-wrap items-start gap-2 border-b border-dashed px-2.5 py-2 last:border-b-0 motion-reduce:transition-none"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">
                        <span className="font-heading tabular-nums">{line.quantity}×</span> {name}
                      </p>
                      {optionLabel ? (
                        <p className="text-muted-foreground text-xs">{optionLabel}</p>
                      ) : null}
                    </div>
                    <p className="font-heading shrink-0 text-sm font-semibold tabular-nums">
                      {formatCurrencyAmount(line.unitPrice * line.quantity, currency, {
                        locale: currencyLocale,
                      })}
                    </p>
                    <div className="flex w-full items-center justify-end gap-0.5 sm:w-auto">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="min-h-11 min-w-11"
                        aria-label={tCart('decreaseQty')}
                        onClick={() =>
                          setLines((prev) =>
                            prev
                              .map((item) =>
                                item.lineId === line.lineId
                                  ? { ...item, quantity: item.quantity - 1 }
                                  : item
                              )
                              .filter((item) => item.quantity > 0)
                          )
                        }
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="min-h-11 min-w-11"
                        aria-label={tCart('increaseQty')}
                        disabled={line.quantity >= 99}
                        onClick={() =>
                          setLines((prev) =>
                            prev.map((item) =>
                              item.lineId === line.lineId
                                ? { ...item, quantity: Math.min(99, item.quantity + 1) }
                                : item
                            )
                          )
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="min-h-11 min-w-11"
                        aria-label={tCommon('remove')}
                        onClick={() =>
                          setLines((prev) => prev.filter((item) => item.lineId !== line.lineId))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="staff-customer-name" className="text-xs">
              {tCheckout('customerName')}
            </Label>
            <Input
              id="staff-customer-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="min-h-11"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="staff-customer-phone" className="text-xs">
              {tCheckout('customerPhone')}
            </Label>
            <Input
              id="staff-customer-phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="min-h-11"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="staff-notes" className="text-xs">
            {tCheckout('orderNotes')}
          </Label>
          <Textarea
            id="staff-notes"
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            rows={2}
            className="min-h-11"
          />
        </div>

        {couponsEnabled && lines.length > 0 ? (
          <CheckoutCoupon
            items={previewItems}
            diningMode={diningMode}
            customerPhone={customerPhone}
            phoneCountry="EG"
            currency={currency}
            currencyLocale={currencyLocale}
            applied={appliedCoupon}
            onApplied={setAppliedCoupon}
            onRemoved={() => setAppliedCoupon(null)}
          />
        ) : null}

        <div className="bg-card/95 sticky bottom-0 mt-auto hidden space-y-2 border-t pt-2 backdrop-blur-sm motion-reduce:backdrop-blur-none md:block">
          {lines.length > 0 && !customerName.trim() ? (
            <p className="text-destructive text-xs">{tCheckout('customerName')}</p>
          ) : null}
          {requiresDelivery && !deliveryLocationId && !noActiveLocations ? (
            <p className="text-destructive text-xs">{t('staffDeliveryRequired')}</p>
          ) : null}
          <div className="space-y-0.5 text-sm">
            <div className="flex justify-between">
              <span>{tCheckout('subtotal')}</span>
              <span className="tabular-nums">
                {formatCurrencyAmount(totals.subtotal, currency, { locale: currencyLocale })}
              </span>
            </div>
            {totals.discount > 0 ? (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                <span>{t('discount')}</span>
                <span className="tabular-nums">
                  −{formatCurrencyAmount(totals.discount, currency, { locale: currencyLocale })}
                </span>
              </div>
            ) : null}
            {totals.deliveryFee > 0 ? (
              <div className="flex justify-between">
                <span>{tCheckout('deliveryFee')}</span>
                <span className="tabular-nums">
                  {formatCurrencyAmount(totals.deliveryFee, currency, { locale: currencyLocale })}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between font-semibold">
              <span>{tCheckout('total')}</span>
              <span className="font-heading tabular-nums">
                {formatCurrencyAmount(totals.total, currency, { locale: currencyLocale })}
              </span>
            </div>
          </div>
          {collectOrder ? (
            <>
              <PaymentClosePanel
                order={collectOrder}
                currencyLocale={currencyLocale}
                busy={placeOrder.isPending}
                t={t}
                onSuccess={() => {
                  void fetchStaffOrderForReceipt(collectOrder.id).then(finishCollect);
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full"
                onClick={() => finishCollect(collectOrder)}
              >
                {t('paymentPrintUnpaid')}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              className="min-h-11 w-full"
              disabled={!canSubmit}
              onClick={() => void handleSubmit()}
            >
              {placeOrder.isPending ? t('staffSaving') : t('staffSavePrint')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const mobileTabs = (
    <div
      className="bg-muted/80 grid grid-cols-2 gap-1 rounded-full p-1 md:hidden"
      role="tablist"
      aria-label={t('newStaffOrder')}
    >
      {(
        [
          { id: 'catalog' as const, label: t('staffPaneMenu') },
          { id: 'ticket' as const, label: t('staffPaneTicket'), count: ticketQty },
        ] as const
      ).map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={mobilePane === item.id}
          onClick={() => setMobilePane(item.id)}
          className={cn(
            'focus-visible:ring-ring inline-flex min-h-11 touch-manipulation items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2',
            mobilePane === item.id
              ? 'bg-secondary text-secondary-foreground shadow-sm'
              : 'text-muted-foreground'
          )}
        >
          {item.label}
          {'count' in item && item.count > 0 ? (
            <span className="tabular-nums">({item.count})</span>
          ) : null}
        </button>
      ))}
    </div>
  );

  const mobileFooter = (
    <div className="border-border bg-card sticky bottom-0 z-10 space-y-2 border-t pt-2 md:hidden">
      {lines.length > 0 && !customerName.trim() ? (
        <button
          type="button"
          className="text-destructive text-start text-xs underline-offset-2 hover:underline"
          onClick={() => setMobilePane('ticket')}
        >
          {tCheckout('customerName')}
        </button>
      ) : null}
      {requiresDelivery && !deliveryLocationId && !noActiveLocations ? (
        <button
          type="button"
          className="text-destructive text-start text-xs underline-offset-2 hover:underline"
          onClick={() => setMobilePane('ticket')}
        >
          {t('staffDeliveryRequired')}
        </button>
      ) : null}
      <div className="flex items-end justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{tCheckout('total')}</span>
        <span className="font-heading text-base font-semibold tabular-nums">
          {formatCurrencyAmount(totals.total, currency, { locale: currencyLocale })}
        </span>
      </div>
      {collectOrder ? (
        <>
          <PaymentClosePanel
            order={collectOrder}
            currencyLocale={currencyLocale}
            busy={placeOrder.isPending}
            t={t}
            onSuccess={() => {
              void fetchStaffOrderForReceipt(collectOrder.id).then(finishCollect);
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            onClick={() => finishCollect(collectOrder)}
          >
            {t('paymentPrintUnpaid')}
          </Button>
        </>
      ) : (
        <Button
          type="button"
          className="min-h-11 w-full"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
        >
          {placeOrder.isPending ? t('staffSaving') : t('staffSavePrint')}
        </Button>
      )}
    </div>
  );

  const header = (
    <div className="space-y-0.5 px-10">
      <h2 className="font-heading text-base font-semibold leading-none">{t('newStaffOrder')}</h2>
      <p className="text-muted-foreground hidden text-xs sm:block">
        {t('staffComposerDescription')}
      </p>
    </div>
  );

  const body = (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {!pending ? mobileTabs : null}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-[minmax(0,55%)_minmax(0,45%)] lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-4">
        {catalogPanel}
        {ticketPanel}
      </div>
      {mobileFooter}
    </div>
  );

  const hiddenReceipt =
    printOrder && settings ? (
      <div className="pointer-events-none fixed start-[-9999px] top-0" aria-hidden="true">
        <OrderReceipt
          order={printOrder}
          settings={settings}
          locale={locale}
          currencyLocale={currencyLocale}
          t={t}
        />
      </div>
    ) : null;

  const overlayClass =
    'bg-black/50 supports-backdrop-filter:backdrop-blur-sm motion-reduce:backdrop-blur-none';

  if (isDesktop) {
    return (
      <>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent
            overlayClassName={overlayClass}
            className="flex h-[min(92dvh,900px)] w-[min(98vw,1600px)] max-w-[min(98vw,1600px)] flex-col gap-3 overflow-hidden rounded-2xl p-4 shadow-2xl motion-reduce:animate-none sm:max-w-[min(98vw,1600px)]"
          >
            <DialogHeader className="gap-0">
              <DialogTitle className="sr-only">{t('newStaffOrder')}</DialogTitle>
              <DialogDescription className="sr-only">
                {t('staffComposerDescription')}
              </DialogDescription>
              {header}
            </DialogHeader>
            {body}
          </DialogContent>
        </Dialog>
        {hiddenReceipt}
      </>
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          overlayClassName={overlayClass}
          className="flex h-[100dvh] max-h-[100dvh] flex-col gap-3 overflow-hidden rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl data-[side=bottom]:h-[100dvh] data-[side=bottom]:max-h-[100dvh] motion-reduce:transition-none"
        >
          <SheetHeader className="p-0">
            <SheetTitle className="sr-only">{t('newStaffOrder')}</SheetTitle>
            <SheetDescription className="sr-only">{t('staffComposerDescription')}</SheetDescription>
            {header}
          </SheetHeader>
          {body}
        </SheetContent>
      </Sheet>
      {hiddenReceipt}
    </>
  );
}
