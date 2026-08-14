'use client';

import { useState } from 'react';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Image } from '@/components/shared/Image';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useMenuSettings } from '@/components/menu/MenuSettingsProvider';
import { useCartStore } from '@/stores/cart-store';
import { trackAddToCart } from '@/lib/analytics';
import { formatCurrencyAmount } from '@/lib/order/format-currency';
import { getCategoryImageFit, type MarketCategoryKind } from '@/lib/market/catalog';
import { parseUnitLabel } from '@/lib/market/units';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { cn, getName } from '@/lib/utils';
import type { Product } from '@/types/database';

interface ProductSheetProps {
  product: Product | null;
  categoryKind: MarketCategoryKind;
  diningMode: 'dining' | 'takeaway';
  onClose: () => void;
}

/** Shopping detail view: bottom sheet on phones, centred modal on desktop. */
export function ProductSheet({ product, categoryKind, diningMode, onClose }: ProductSheetProps) {
  const isDesktop = useIsDesktop();
  const { locale } = useI18n();
  const t = useTranslations('menu');
  const tCart = useTranslations('cart');
  const { settings, currency } = useMenuSettings();
  const addItem = useCartStore((s) => s.addItem);
  const [qty, setQty] = useState(1);
  const [openedProductId, setOpenedProductId] = useState(product?.id ?? null);

  if ((product?.id ?? null) !== openedProductId) {
    setOpenedProductId(product?.id ?? null);
    setQty(1);
  }

  if (!product) return null;

  const currencyLocale = locale === 'ar' ? 'ar' : 'en';
  const productName = getName(locale, product.name_en, product.name_ar);
  const secondaryName = locale === 'ar' ? product.name_en : product.name_ar;
  const description = getName(
    locale,
    product.description_en || '',
    product.description_ar || ''
  )?.trim();
  const unitLabel = parseUnitLabel(product.description_ar, product.description_en, currencyLocale);
  const imageFit = getCategoryImageFit(categoryKind);
  const price = diningMode === 'dining' ? product.dining_price : product.takeaway_price;

  const handleAdd = () => {
    if (!product.is_available) return;
    addItem({
      productId: product.id,
      name_en: product.name_en,
      name_ar: product.name_ar,
      image_url: product.image_url,
      dining_price: product.dining_price,
      takeaway_price: product.takeaway_price,
      quantity: qty,
      notes: '',
    });
    trackAddToCart(product.id, qty, diningMode);
    onClose();
  };

  const media = (
    <div
      className={cn(
        'relative aspect-square w-full shrink-0 overflow-hidden rounded-[var(--hm-radius)]',
        imageFit === 'contain' ? 'bg-white' : 'bg-[var(--hm-surface-muted)]',
        'border border-[var(--hm-line)]'
      )}
    >
      {product.image_url ? (
        <Image
          src={product.image_url}
          alt={productName}
          fill
          sizes="(max-width: 768px) 90vw, 360px"
          className={imageFit === 'contain' ? 'object-contain p-4' : 'object-cover'}
          containerClassName="absolute inset-0 h-full w-full"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-heading text-4xl text-[var(--hm-ink-faint)]">
            {productName.charAt(0)}
          </span>
        </div>
      )}
    </div>
  );

  const details = (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="space-y-1">
        {secondaryName ? (
          <p className="text-xs text-[var(--hm-ink-faint)]" dir={locale === 'ar' ? 'ltr' : 'rtl'}>
            {secondaryName}
          </p>
        ) : null}
        {unitLabel && (
          <span
            className="inline-flex w-fit items-center rounded-full border border-[var(--hm-line)] bg-[var(--hm-surface-muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--hm-ink-soft)]"
            dir="auto"
          >
            {unitLabel}
          </span>
        )}
      </div>

      {description ? (
        <p className="text-sm leading-relaxed text-[var(--hm-ink-soft)]">{description}</p>
      ) : null}

      <p className="text-xl font-bold tabular-nums text-[var(--hm-price)]" dir="ltr">
        {formatCurrencyAmount(price, currency, { locale: currencyLocale })}
      </p>

      {product.is_available ? (
        <div className="mt-auto flex items-stretch gap-2 pt-1">
          <div
            className="inline-flex h-12 shrink-0 items-stretch overflow-hidden rounded-[var(--hm-radius)] border border-[var(--hm-line-strong)]"
            role="group"
            aria-label={tCart('quantity')}
          >
            <button
              type="button"
              className="flex w-11 items-center justify-center text-[var(--hm-ink)] transition-colors hover:bg-[var(--hm-surface-muted)] disabled:pointer-events-none disabled:opacity-40"
              onClick={() => setQty((current) => Math.max(1, current - 1))}
              aria-label={tCart('decreaseQty')}
              disabled={qty <= 1}
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            <span
              className="flex min-w-10 items-center justify-center border-x border-[var(--hm-line-strong)] px-1 text-sm font-semibold tabular-nums"
              aria-live="polite"
            >
              {qty}
            </span>
            <button
              type="button"
              className="flex w-11 items-center justify-center text-[var(--hm-ink)] transition-colors hover:bg-[var(--hm-surface-muted)]"
              onClick={() => setQty((current) => current + 1)}
              aria-label={tCart('increaseQty')}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <Button
            type="button"
            onClick={handleAdd}
            className="h-12 flex-1 rounded-[var(--hm-radius)] bg-[var(--hm-accent)] text-sm font-semibold text-[var(--hm-on-accent)] hover:bg-[var(--hm-accent-strong)]"
            data-testid="sheet-add-to-cart"
          >
            <ShoppingCart className="me-2 h-4 w-4" aria-hidden="true" />
            {tCart('addToCart')}
          </Button>
        </div>
      ) : (
        <Badge variant="secondary" className="w-fit">
          {t('currentlyUnavailable')}
        </Badge>
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-start text-lg">{productName}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-5">
            <div className="w-[280px] shrink-0">{media}</div>
            {details}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="max-h-[90svh] overflow-y-auto rounded-t-2xl bg-[var(--hm-surface)] pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="pb-0">
          <SheetTitle className="pe-8 text-start text-base">{productName}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-4">
          <div className="mx-auto w-full max-w-[260px]">{media}</div>
          {details}
        </div>
      </SheetContent>
    </Sheet>
  );
}
