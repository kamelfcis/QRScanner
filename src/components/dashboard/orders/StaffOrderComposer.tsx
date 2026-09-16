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
import { CheckoutCoupon, type AppliedCoupon } from '@/components/checkout/CheckoutCoupon';
import { OrderReceipt } from '@/components/dashboard/orders/OrderReceipt';
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
import { formatDeliveryLocationOption } from '@/lib/order/delivery-location';
import {
  formatCurrencyAmount,
  getRestaurantCurrency,
  toCurrencyLocale,
} from '@/lib/order/format-currency';
import { printReceiptElement, receiptDomId } from '@/lib/order/print-receipt';
import { calculateOrderTotals, getCartLineUnitPrice, type DiningMode } from '@/lib/order/totals';
import { computeWeightPrice, hasWeightOptions } from '@/lib/order/weight-price';
import { cn, getName } from '@/lib/utils';
import type { OrderWithItems } from '@/types/database';
import type { StaffPlaceOrderInput } from '@/types/schema';

type FulfillmentType = 'pickup' | 'delivery';
type SizeOption = 'small' | 'large';

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

interface PendingProduct {
  product: StaffCatalogProduct;
  mode: 'size' | 'weight' | 'add';
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
    has_size_options: product.has_size_options,
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
  const [pending, setPending] = useState<PendingProduct | null>(null);
  const [printOrder, setPrintOrder] = useState<OrderWithItems | null>(null);

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
    setCustomerName('');
    setCustomerPhone('');
    setDeliveryLocationId(null);
    setDeliveryAddressDetails('');
    setOrderNotes('');
    setAppliedCoupon(null);
    setPending(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) resetForm();
      onOpenChange(next);
    },
    [onOpenChange, resetForm]
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

  const totals = appliedCoupon
    ? {
        ...localTotals,
        subtotal: appliedCoupon.subtotal,
        discount: appliedCoupon.discountAmount,
        tax: appliedCoupon.tax,
        service: appliedCoupon.service,
        total: appliedCoupon.total + deliveryFee,
      }
    : localTotals;

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

  const noActiveLocations =
    requiresDelivery && !locationsLoading && (deliveryLocations?.length ?? 0) === 0;

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
    if (product.has_size_options) {
      setPending({ product, mode: 'size' });
      return;
    }
    if (hasWeightOptions(product)) {
      setPending({ product, mode: 'weight' });
      return;
    }
    addLine(product, {});
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
    !placeOrder.isPending;

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
      handleOpenChange(false);
      const fullOrder = await fetchStaffOrderForReceipt(result.id);
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
    <div className="flex min-h-0 flex-1 flex-col gap-3">
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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryId(null)}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium',
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
              'rounded-full border px-3 py-1 text-xs font-medium',
              categoryId === cat.id
                ? 'border-secondary bg-secondary text-secondary-foreground'
                : 'border-border text-muted-foreground'
            )}
          >
            {getName(locale, cat.name_en, cat.name_ar, cat.name_fr, cat.name_nl)}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border p-2">
        {catalogLoading ? (
          <p className="text-muted-foreground p-4 text-center text-sm">{tCommon('loading')}</p>
        ) : flatProducts.length === 0 ? (
          <p className="text-muted-foreground p-4 text-center text-sm">{t('staffEmptyCatalog')}</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-muted-foreground p-4 text-center text-sm">{tMenu('noProducts')}</p>
        ) : (
          <ul className="space-y-1">
            {filteredProducts.map((product) => {
              const name = getName(
                locale,
                product.name_en,
                product.name_ar,
                product.name_fr,
                product.name_nl
              );
              const previewPrice = hasWeightOptions(product)
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

              return (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => handleProductTap(product)}
                    className="hover:bg-muted flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start transition-colors"
                  >
                    {product.image_url ? (
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md">
                        <Image
                          src={product.image_url}
                          alt=""
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="bg-muted h-11 w-11 shrink-0 rounded-md" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{name}</p>
                      {previewPrice != null ? (
                        <p className="text-muted-foreground text-xs tabular-nums">
                          {formatCurrencyAmount(previewPrice, currency, { locale: currencyLocale })}
                          {hasWeightOptions(product)
                            ? ` · ${t('staffWeightGrams', { grams: product.weight_options_g?.[0] ?? 0 })}`
                            : ''}
                        </p>
                      ) : null}
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
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setDiningMode('dining')}
          className={cn(
            'min-h-11 rounded-lg border px-3 text-sm font-medium',
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
          className={cn(
            'min-h-11 rounded-lg border px-3 text-sm font-medium',
            diningMode === 'takeaway'
              ? 'border-secondary bg-secondary/10 text-secondary'
              : 'border-border text-muted-foreground'
          )}
        >
          {t('takeaway')}
        </button>
      </div>

      {isTakeaway ? (
        <div className="grid grid-cols-2 gap-2">
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
                className={cn(
                  'flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border px-2 text-xs font-medium',
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
        <div className="space-y-1.5">
          <Label htmlFor="staff-table">{t('table')}</Label>
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
        <div className="space-y-3">
          {noActiveLocations ? (
            <p className="text-destructive text-sm">{t('staffNoDeliveryLocations')}</p>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="staff-delivery-location">{tCheckout('deliveryLocation')}</Label>
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
              <div className="space-y-1.5">
                <Label htmlFor="staff-delivery-details">{tCheckout('deliveryDetails')}</Label>
                <Textarea
                  id="staff-delivery-details"
                  value={deliveryAddressDetails}
                  onChange={(e) => setDeliveryAddressDetails(e.target.value)}
                  placeholder={tCheckout('deliveryDetailsPlaceholder')}
                  rows={2}
                />
              </div>
            </>
          )}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border">
        {lines.length === 0 ? (
          <p className="text-muted-foreground p-4 text-center text-sm">{t('staffEmptyTicket')}</p>
        ) : (
          <ul className="divide-y">
            {pricedLines.map((line) => {
              const name = getName(locale, line.name_en, line.name_ar, line.name_fr, line.name_nl);
              return (
                <li key={line.lineId} className="flex items-start gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-muted-foreground text-xs">
                      {line.sizeOption
                        ? line.sizeOption === 'small'
                          ? t('small')
                          : t('large')
                        : null}
                      {line.weightGrams != null ? ` · ${line.weightGrams}g` : null}
                    </p>
                    <p className="mt-1 text-sm tabular-nums">
                      {formatCurrencyAmount(line.unitPrice * line.quantity, currency, {
                        locale: currencyLocale,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
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
                    <span className="min-w-6 text-center text-sm tabular-nums">
                      {line.quantity}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
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
        <div className="space-y-1.5">
          <Label htmlFor="staff-customer-name">{tCheckout('customerName')}</Label>
          <Input
            id="staff-customer-name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="min-h-11"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="staff-customer-phone">{tCheckout('customerPhone')}</Label>
          <Input
            id="staff-customer-phone"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="min-h-11"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="staff-notes">{tCheckout('orderNotes')}</Label>
        <Textarea
          id="staff-notes"
          value={orderNotes}
          onChange={(e) => setOrderNotes(e.target.value)}
          rows={2}
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

      <div className="bg-muted/40 space-y-1 rounded-xl border p-3 text-sm">
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
          <span className="tabular-nums">
            {formatCurrencyAmount(totals.total, currency, { locale: currencyLocale })}
          </span>
        </div>
      </div>

      <Button
        type="button"
        className="min-h-11 w-full"
        disabled={!canSubmit}
        onClick={() => void handleSubmit()}
      >
        {placeOrder.isPending ? t('staffSaving') : t('staffSavePrint')}
      </Button>
    </div>
  );

  const body = (
    <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2 md:gap-6">
      {catalogPanel}
      {ticketPanel}
    </div>
  );

  const pickerDialog = pending ? (
    <Dialog open onOpenChange={() => setPending(null)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {getName(
              locale,
              pending.product.name_en,
              pending.product.name_ar,
              pending.product.name_fr,
              pending.product.name_nl
            )}
          </DialogTitle>
          <DialogDescription>{t('staffChooseOption')}</DialogDescription>
        </DialogHeader>
        {pending.mode === 'size' ? (
          <div className="grid grid-cols-2 gap-2">
            {(['small', 'large'] as const).map((size) => (
              <Button
                key={size}
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => {
                  addLine(pending.product, { sizeOption: size });
                  setPending(null);
                }}
              >
                {size === 'small' ? t('small') : t('large')}
              </Button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(pending.product.weight_options_g ?? []).map((grams) => (
              <Button
                key={grams}
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => {
                  addLine(pending.product, { weightGrams: grams });
                  setPending(null);
                }}
              >
                {tMenu('grams', { grams })}
                {' · '}
                {formatCurrencyAmount(
                  computeWeightPrice(Number(pending.product.price_per_kg), grams),
                  currency,
                  { locale: currencyLocale }
                )}
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  ) : null;

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

  if (isDesktop) {
    return (
      <>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col gap-4 overflow-hidden">
            <DialogHeader>
              <DialogTitle>{t('newStaffOrder')}</DialogTitle>
              <DialogDescription>{t('staffComposerDescription')}</DialogDescription>
            </DialogHeader>
            {body}
          </DialogContent>
        </Dialog>
        {pickerDialog}
        {hiddenReceipt}
      </>
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="flex h-[95vh] flex-col gap-4 overflow-hidden">
          <SheetHeader>
            <SheetTitle>{t('newStaffOrder')}</SheetTitle>
            <SheetDescription>{t('staffComposerDescription')}</SheetDescription>
          </SheetHeader>
          {body}
        </SheetContent>
      </Sheet>
      {pickerDialog}
      {hiddenReceipt}
    </>
  );
}
