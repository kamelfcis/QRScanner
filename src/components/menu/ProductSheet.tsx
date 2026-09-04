'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, ShoppingCart, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Image } from '@/components/shared/Image';
import { BadgePill, pickBadges } from '@/components/menu/ProductBadges';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useCartStore, type CartSizeOption } from '@/stores/cart-store';
import { trackAddToCart } from '@/lib/analytics';
import { haptic } from '@/lib/haptics';
import {
  formatCurrencyAmount,
  getRestaurantCurrency,
  toCurrencyLocale,
} from '@/lib/order/format-currency';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { hasExtendedMenuLocales } from '@/i18n/config';
import { cn, getName } from '@/lib/utils';
import { computeWeightPrice, hasWeightOptions, minWeightPrice } from '@/lib/order/weight-price';
import type { Product } from '@/types/database';

interface ProductSheetProps {
  product: Product | null;
  diningMode: 'dining' | 'takeaway';
  onClose: () => void;
  onAdded?: () => void;
}

export function ProductSheet({ product, diningMode, onClose, onAdded }: ProductSheetProps) {
  const isDesktop = useIsDesktop();
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useI18n();
  const t = useTranslations('menu');
  const tCart = useTranslations('cart');
  const { data: settings } = useRestaurantSettings();
  const addItem = useCartStore((s) => s.addItem);

  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [sizeOption, setSizeOption] = useState<CartSizeOption>('small');
  const [weightGrams, setWeightGrams] = useState<number | null>(null);

  useEffect(() => {
    if (product) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset controls per dish
      setQty(1);
      setNotes('');
      setSizeOption('small');
      const weights = product.weight_options_g;
      setWeightGrams(weights?.length ? weights[0] : null);
    }
  }, [product]);

  if (!product) return null;

  const currency = getRestaurantCurrency(settings?.currency);
  const currencyLocale = toCurrencyLocale(locale);
  const maxNotes = settings?.max_order_notes_length ?? 200;
  const hasSizeOptions = product.has_size_options;
  const showWeightPicker = hasWeightOptions(product);
  const weightOptions = product.weight_options_g ?? [];
  const activePrice = showWeightPicker
    ? weightGrams != null && product.price_per_kg != null
      ? computeWeightPrice(product.price_per_kg, weightGrams)
      : (minWeightPrice(product) ?? product.dining_price)
    : hasSizeOptions
      ? sizeOption === 'large'
        ? product.takeaway_price
        : product.dining_price
      : diningMode === 'dining'
        ? product.dining_price
        : product.takeaway_price;
  const otherPrice =
    hasSizeOptions || showWeightPicker
      ? null
      : diningMode === 'dining'
        ? product.takeaway_price
        : product.dining_price;
  const badges = pickBadges(product);
  const productName = getName(
    locale,
    product.name_en,
    product.name_ar,
    product.name_fr,
    product.name_nl
  );
  const secondaryName =
    locale === 'ar'
      ? product.name_en
      : locale === 'en'
        ? product.name_ar
        : hasExtendedMenuLocales
          ? locale === 'fr'
            ? product.name_fr || product.name_en
            : product.name_nl || product.name_en
          : null;
  const description = product.description_en
    ? getName(
        locale,
        product.description_en,
        product.description_ar,
        product.description_fr,
        product.description_nl
      )
    : '';
  const canAdd =
    product.is_available &&
    (!hasSizeOptions || sizeOption !== null) &&
    (!showWeightPicker || weightGrams != null);

  const handleAdd = () => {
    if (!canAdd) return;
    const unitPrice = activePrice;
    addItem({
      productId: product.id,
      name_en: product.name_en,
      name_ar: product.name_ar,
      name_fr: product.name_fr,
      name_nl: product.name_nl,
      image_url: product.image_url,
      dining_price: showWeightPicker ? unitPrice : product.dining_price,
      takeaway_price: showWeightPicker ? unitPrice : product.takeaway_price,
      has_size_options: hasSizeOptions,
      price_per_kg: product.price_per_kg,
      weight_options_g: product.weight_options_g,
      sizeOption: hasSizeOptions ? sizeOption : null,
      weightGrams: showWeightPicker ? weightGrams : null,
      quantity: qty,
      notes,
    });
    trackAddToCart(product.id, qty, diningMode);
    onAdded?.();
    onClose();
  };

  const hero = (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-[var(--menu-paper-deep)]',
        isDesktop ? 'h-full min-h-[320px]' : 'aspect-[4/3]'
      )}
    >
      {product.image_url ? (
        <Image
          src={product.image_url}
          alt={productName}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 45vw"
          className="object-cover"
          containerClassName="absolute inset-0 h-full w-full"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(120%_100%_at_50%_0%,#ece2d2_0%,#ded1ba_100%)]">
          <span className="font-heading text-6xl text-[var(--menu-gold-faint)]">
            {productName.charAt(0)}
          </span>
        </div>
      )}
      {badges.length > 0 && (
        <div className="pointer-events-none absolute start-3 top-3 flex flex-wrap gap-1.5">
          {badges.map((badge) => (
            <BadgePill key={badge} badge={badge} />
          ))}
        </div>
      )}
    </div>
  );

  const details = (
    <div className="space-y-4">
      <div>
        <SheetTitleOrDialogTitle isDesktop={isDesktop}>
          <span className="font-heading block text-xl font-semibold leading-tight text-[var(--menu-ink)] sm:text-2xl">
            {productName}
          </span>
        </SheetTitleOrDialogTitle>
        {secondaryName && (
          <p
            className="mt-1 text-xs text-[var(--menu-ink-soft)]"
            dir={locale === 'ar' ? 'ltr' : 'rtl'}
          >
            {secondaryName}
          </p>
        )}
      </div>

      <SheetDescriptionOrDialogDescription isDesktop={isDesktop}>
        {description ? (
          <span className="block text-sm leading-relaxed text-[var(--menu-ink-soft)]">
            {description}
          </span>
        ) : (
          <span className="sr-only">{t('dishDetails')}</span>
        )}
      </SheetDescriptionOrDialogDescription>

      {hasSizeOptions ? (
        <div className="space-y-2 border-t border-[var(--menu-line)] pt-4">
          <Label className="text-xs text-[var(--menu-ink-soft)]">{t('selectSize')}</Label>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label={t('selectSize')}>
            {(['small', 'large'] as const).map((size) => {
              const price = size === 'small' ? product.dining_price : product.takeaway_price;
              const selected = sizeOption === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    haptic.tick();
                    setSizeOption(size);
                  }}
                  className={cn(
                    'rounded-xl border px-3 py-3 text-start transition-colors',
                    selected
                      ? 'border-[var(--menu-wine)] bg-[var(--menu-gold-wash)]'
                      : 'border-[var(--menu-line-strong)] bg-[var(--menu-surface)] hover:bg-[var(--menu-paper)]'
                  )}
                  aria-pressed={selected}
                >
                  <span className="block text-sm font-medium text-[var(--menu-ink)]">
                    {size === 'small' ? t('small') : t('large')}
                  </span>
                  <span
                    className="mt-1 block text-sm font-semibold tabular-nums text-[var(--menu-wine)]"
                    dir="ltr"
                  >
                    {formatCurrencyAmount(price, currency, { locale: currencyLocale })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : showWeightPicker ? (
        <div className="space-y-2 border-t border-[var(--menu-line)] pt-4">
          <Label className="text-xs text-[var(--menu-ink-soft)]">{t('selectWeight')}</Label>
          <div
            className="grid grid-cols-3 gap-2 sm:grid-cols-4"
            role="group"
            aria-label={t('selectWeight')}
          >
            {weightOptions.map((grams) => {
              const price =
                product.price_per_kg != null
                  ? computeWeightPrice(product.price_per_kg, grams)
                  : product.dining_price;
              const selected = weightGrams === grams;
              return (
                <button
                  key={grams}
                  type="button"
                  onClick={() => {
                    haptic.tick();
                    setWeightGrams(grams);
                  }}
                  className={cn(
                    'rounded-xl border px-2 py-3 text-center transition-colors',
                    selected
                      ? 'border-[var(--menu-wine)] bg-[var(--menu-gold-wash)]'
                      : 'border-[var(--menu-line-strong)] bg-[var(--menu-surface)] hover:bg-[var(--menu-paper)]'
                  )}
                  aria-pressed={selected}
                >
                  <span className="block text-sm font-medium text-[var(--menu-ink)]">
                    {t('grams', { grams })}
                  </span>
                  <span
                    className="mt-1 block text-sm font-semibold tabular-nums text-[var(--menu-wine)]"
                    dir="ltr"
                  >
                    {formatCurrencyAmount(price, currency, { locale: currencyLocale })}
                  </span>
                </button>
              );
            })}
          </div>
          {product.price_per_kg != null ? (
            <p className="text-xs text-[var(--menu-ink-soft)]" dir="ltr">
              {formatCurrencyAmount(product.price_per_kg, currency, { locale: currencyLocale })}
              /kg
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex items-end gap-3 border-t border-[var(--menu-line)] pt-4">
          <p
            className="font-heading text-2xl font-semibold tabular-nums text-[var(--menu-wine)]"
            dir="ltr"
          >
            {formatCurrencyAmount(activePrice, currency, { locale: currencyLocale })}
          </p>
          {otherPrice !== null && otherPrice !== activePrice && (
            <p className="pb-1 text-xs tabular-nums text-[var(--menu-ink-soft)]">
              {diningMode === 'dining' ? tCart('takeawayPrice') : tCart('diningPrice')}:{' '}
              {formatCurrencyAmount(otherPrice, currency, { locale: currencyLocale })}
            </p>
          )}
        </div>
      )}

      {product.is_available ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label
              htmlFor={`sheet-notes-${product.id}`}
              className="text-xs text-[var(--menu-ink-soft)]"
            >
              {tCart('itemNotes')}
            </Label>
            <Input
              id={`sheet-notes-${product.id}`}
              value={notes}
              maxLength={maxNotes}
              placeholder={tCart('itemNotesPlaceholder')}
              onChange={(e) => setNotes(e.target.value)}
              autoComplete="off"
              className="h-11 rounded-lg"
            />
          </div>
        </div>
      ) : (
        <p className="rounded-lg bg-[var(--menu-paper-deep)] px-3 py-2 text-sm text-[var(--menu-ink-soft)]">
          {t('currentlyUnavailable')}
        </p>
      )}
    </div>
  );

  const cta = product.is_available ? (
    <div className="flex items-center gap-3">
      <div
        className="inline-flex h-12 shrink-0 items-stretch overflow-hidden rounded-full border border-[var(--menu-line-strong)] bg-[var(--menu-surface)]"
        role="group"
        aria-label={tCart('quantity')}
      >
        <button
          type="button"
          className="flex w-11 items-center justify-center text-[var(--menu-ink)] transition-colors hover:bg-[var(--menu-gold-wash)] disabled:pointer-events-none disabled:opacity-40"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          aria-label={tCart('decreaseQty')}
          disabled={qty <= 1}
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <span
          className="flex min-w-8 items-center justify-center text-base font-medium tabular-nums"
          aria-live="polite"
        >
          {qty}
        </span>
        <button
          type="button"
          className="flex w-11 items-center justify-center text-[var(--menu-ink)] transition-colors hover:bg-[var(--menu-gold-wash)]"
          onClick={() => setQty((q) => q + 1)}
          aria-label={tCart('increaseQty')}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <motion.div
        className="min-w-0 flex-1"
        whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
      >
        <Button
          type="button"
          className="h-12 w-full rounded-full bg-[var(--menu-wine)] text-sm font-semibold text-[#FDF7F0] hover:bg-[var(--menu-wine-deep)]"
          onClick={handleAdd}
          disabled={!canAdd}
          data-testid="sheet-add-to-cart"
        >
          <ShoppingCart className="me-2 h-4 w-4" aria-hidden="true" />
          {tCart('addToCart')}
          <span className="ms-2 tabular-nums opacity-80" dir="ltr">
            {formatCurrencyAmount(activePrice * qty, currency, { locale: currencyLocale })}
          </span>
        </Button>
      </motion.div>
    </div>
  ) : (
    <Button type="button" variant="outline" className="h-12 w-full rounded-full" onClick={onClose}>
      {tCart('browseMenu')}
    </Button>
  );

  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      aria-label={t('closeDetails')}
      className="bg-[#FDF7F0]/92 absolute end-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-[var(--menu-ink)] shadow-[0_1px_6px_rgba(33,29,24,0.2)] backdrop-blur-[2px] transition-colors hover:bg-[#FDF7F0]"
    >
      <X className="h-4 w-4" aria-hidden="true" />
    </button>
  );

  if (isDesktop) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          showCloseButton={false}
          className="grid max-h-[86svh] w-full max-w-3xl grid-cols-1 gap-0 overflow-hidden rounded-2xl bg-[var(--menu-surface)] p-0 sm:max-w-3xl md:grid-cols-[45%_1fr]"
        >
          {closeButton}
          <div className="relative hidden md:block">{hero}</div>
          <div className="flex max-h-[86svh] flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">{details}</div>
            <div className="border-t border-[var(--menu-line)] bg-[var(--menu-paper)] p-4">
              {cta}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[90svh] gap-0 overflow-hidden rounded-t-2xl bg-[var(--menu-surface)] p-0"
      >
        {closeButton}
        <div className="flex max-h-[90svh] flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {hero}
            <div className="px-4 pb-4 pt-4">{details}</div>
          </div>
          <div className="border-t border-[var(--menu-line)] bg-[var(--menu-paper)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            {cta}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SheetTitleOrDialogTitle({
  isDesktop,
  children,
}: {
  isDesktop: boolean;
  children: React.ReactNode;
}) {
  return isDesktop ? (
    <DialogTitle className="text-start">{children}</DialogTitle>
  ) : (
    <SheetTitle className="text-start">{children}</SheetTitle>
  );
}

function SheetDescriptionOrDialogDescription({
  isDesktop,
  children,
}: {
  isDesktop: boolean;
  children: React.ReactNode;
}) {
  return isDesktop ? (
    <DialogDescription className="text-start">{children}</DialogDescription>
  ) : (
    <SheetDescription className="text-start">{children}</SheetDescription>
  );
}
