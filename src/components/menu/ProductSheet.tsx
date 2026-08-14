'use client';

import { useEffect, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Image } from '@/components/shared/Image';
import { ProductBadges } from '@/components/menu/ProductBadges';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useCartStore } from '@/stores/cart-store';
import { trackAddToCart } from '@/lib/analytics';
import { formatCurrencyAmount, getRestaurantCurrency } from '@/lib/order/format-currency';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getName } from '@/lib/utils';
import type { Product } from '@/types/database';

interface ProductSheetProps {
  product: Product | null;
  onClose: () => void;
}

const DESCRIPTION_CLAMP = 170;

/**
 * Replaces the old pinch-zoom lightbox. Guests do not want to zoom a photo,
 * they want the full description, both prices, and one confident add button —
 * a bottom sheet on phones, a centred dialog on desktop.
 */
export function ProductSheet({ product, onClose }: ProductSheetProps) {
  const isDesktop = useIsDesktop();
  // Hold on to the last product so the closing transition has something to paint.
  const [shown, setShown] = useState<Product | null>(product);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keep the sheet body alive while it animates out
    if (product) setShown(product);
  }, [product]);

  const open = product !== null;
  if (!shown) return null;

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent
          showCloseButton={false}
          className="bg-aklet-paper-soft max-h-[88svh] gap-0 overflow-y-auto p-0 sm:max-w-lg"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{shown.name_ar || shown.name_en}</DialogTitle>
          </DialogHeader>
          <ProductSheetBody key={shown.id} product={shown} onClose={onClose} rounded />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="bg-aklet-paper-soft max-h-[90svh] gap-0 overflow-y-auto rounded-t-2xl p-0"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{shown.name_ar || shown.name_en}</SheetTitle>
          <SheetDescription>{shown.description_ar || shown.description_en || ''}</SheetDescription>
        </SheetHeader>
        <ProductSheetBody key={shown.id} product={shown} onClose={onClose} />
      </SheetContent>
    </Sheet>
  );
}

function ProductSheetBody({
  product,
  onClose,
  rounded = false,
}: {
  product: Product;
  onClose: () => void;
  rounded?: boolean;
}) {
  const { locale } = useI18n();
  const t = useTranslations('menu');
  const tCart = useTranslations('cart');
  const tA11y = useTranslations('accessibility');
  const { data: settings } = useRestaurantSettings();
  const addItem = useCartStore((s) => s.addItem);
  const diningMode = useCartStore((s) => s.diningMode);

  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [expanded, setExpanded] = useState(false);

  const currency = getRestaurantCurrency(settings?.currency);
  const currencyLocale = locale === 'ar' ? 'ar' : 'en';
  const maxNotes = settings?.max_order_notes_length ?? 200;

  const productName = getName(locale, product.name_en, product.name_ar);
  const secondaryName = locale === 'ar' ? product.name_en : product.name_ar;
  const description = getName(locale, product.description_en || '', product.description_ar || '');
  const isLong = description.length > DESCRIPTION_CLAMP;
  const shownDescription =
    isLong && !expanded ? `${description.slice(0, DESCRIPTION_CLAMP).trimEnd()}…` : description;

  const activePrice = diningMode === 'dining' ? product.dining_price : product.takeaway_price;
  const otherPrice = diningMode === 'dining' ? product.takeaway_price : product.dining_price;
  const lineTotal = activePrice * qty;

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
      notes,
    });
    trackAddToCart(product.id, qty, diningMode);
    onClose();
  };

  return (
    <div className="flex flex-col">
      <div
        className={`bg-aklet-sand/50 relative aspect-[4/3] w-full shrink-0 overflow-hidden ${
          rounded ? 'rounded-t-xl' : 'rounded-t-2xl'
        }`}
      >
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={productName}
            fill
            sizes="(max-width: 768px) 100vw, 512px"
            className="object-cover"
            containerClassName="absolute inset-0 h-full w-full"
          />
        ) : (
          <span className="text-aklet-ink-soft/40 font-heading absolute inset-0 flex items-center justify-center text-5xl">
            {productName.charAt(0)}
          </span>
        )}
        <div className="absolute start-3 top-3 flex flex-wrap gap-1">
          <ProductBadges product={product} compact={false} />
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={tA11y('close')}
          className="bg-aklet-grill/60 absolute end-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-white backdrop-blur-sm transition-colors hover:bg-black/70"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-3 p-4 pb-3">
        <div>
          <h2 className="font-heading text-aklet-ink text-lg font-bold leading-snug sm:text-xl">
            {productName}
          </h2>
          {secondaryName ? (
            <p className="text-aklet-ink-soft mt-0.5 text-xs" dir="auto">
              {secondaryName}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-aklet-price text-xl font-bold tabular-nums" dir="ltr">
            {formatCurrencyAmount(activePrice, currency, { locale: currencyLocale })}
          </p>
          {otherPrice !== activePrice && (
            <p className="text-aklet-ink-soft text-xs tabular-nums" dir="auto">
              {diningMode === 'dining' ? tCart('takeawayPrice') : tCart('diningPrice')}{' '}
              {formatCurrencyAmount(otherPrice, currency, { locale: currencyLocale })}
            </p>
          )}
        </div>

        {description ? (
          <div>
            <p className="text-aklet-ink-soft text-sm leading-relaxed">{shownDescription}</p>
            {isLong && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-aklet-ocean mt-1 text-xs font-semibold underline-offset-2 hover:underline"
              >
                {expanded ? t('showLess') : t('showMore')}
              </button>
            )}
          </div>
        ) : null}

        {product.is_available ? (
          <div className="space-y-1.5">
            <Label htmlFor={`sheet-notes-${product.id}`} className="text-aklet-ink-soft text-xs">
              {tCart('itemNotes')}
            </Label>
            <Input
              id={`sheet-notes-${product.id}`}
              value={notes}
              maxLength={maxNotes}
              placeholder={tCart('itemNotesPlaceholder')}
              onChange={(e) => setNotes(e.target.value)}
              autoComplete="off"
              className="bg-aklet-paper border-aklet-line/80 h-11"
            />
          </div>
        ) : (
          <p className="text-aklet-ink-soft text-sm">{t('currentlyUnavailable')}</p>
        )}
      </div>

      {product.is_available && (
        <div className="border-aklet-line/70 bg-aklet-paper-soft sticky bottom-0 flex items-center gap-3 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div
            className="border-aklet-line/80 bg-aklet-paper inline-flex h-12 shrink-0 items-stretch overflow-hidden rounded-xl border"
            role="group"
            aria-label={tCart('quantity')}
          >
            <button
              type="button"
              className="text-aklet-ink hover:bg-aklet-sand/70 flex w-10 items-center justify-center transition-colors disabled:pointer-events-none disabled:opacity-40"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label={tCart('decreaseQty')}
              disabled={qty <= 1}
            >
              <Minus className="h-4 w-4" aria-hidden />
            </button>
            <span
              className="border-aklet-line/80 flex min-w-9 items-center justify-center border-x text-sm font-semibold tabular-nums"
              aria-live="polite"
              aria-label={tCart('quantity')}
            >
              {qty}
            </span>
            <button
              type="button"
              className="text-aklet-ink hover:bg-aklet-sand/70 flex w-10 items-center justify-center transition-colors"
              onClick={() => setQty((q) => q + 1)}
              aria-label={tCart('increaseQty')}
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <Button
            type="button"
            onClick={handleAdd}
            data-testid="sheet-add-to-cart"
            className="bg-aklet-coral-cta hover:bg-aklet-coral-cta/90 h-12 flex-1 rounded-xl text-sm font-bold text-white"
          >
            <span>{tCart('addToCart')}</span>
            <span className="mx-2 opacity-60">·</span>
            <span className="tabular-nums" dir="ltr">
              {formatCurrencyAmount(lineTotal, currency, { locale: currencyLocale })}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}
