'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Image } from '@/components/shared/Image';
import { ProductBadges } from '@/components/menu/ProductBadges';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useCartStore } from '@/stores/cart-store';
import { trackAddToCart } from '@/lib/analytics';
import { formatCurrencyAmount, getRestaurantCurrency } from '@/lib/order/format-currency';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { cn, getName } from '@/lib/utils';
import type { Product } from '@/types/database';

interface ProductCardProps {
  product: Product;
  diningMode: 'dining' | 'takeaway';
  isFavorite: boolean;
  onToggleFavorite: (product: Product) => void;
  onImageClick: (product: Product) => void;
  onAddedToCart?: () => void;
}

/**
 * Square editorial card. The photograph carries the appetite, the text stays
 * to one line each so a two-up phone grid never turns into a wall of prose —
 * the full description lives in the product sheet.
 */
export function ProductCard({
  product,
  diningMode,
  isFavorite,
  onToggleFavorite,
  onImageClick,
  onAddedToCart,
}: ProductCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useI18n();
  const t = useTranslations('menu');
  const tCart = useTranslations('cart');
  const tCommon = useTranslations('common');
  const { data: settings } = useRestaurantSettings();
  const addItem = useCartStore((s) => s.addItem);

  const [qty, setQty] = useState(1);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [pulse, setPulse] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const currency = getRestaurantCurrency(settings?.currency);
  const currencyLocale = locale === 'ar' ? 'ar' : 'en';
  const maxNotes = settings?.max_order_notes_length ?? 200;
  const activePrice = diningMode === 'dining' ? product.dining_price : product.takeaway_price;
  const otherPrice = diningMode === 'dining' ? product.takeaway_price : product.dining_price;
  const productName = getName(locale, product.name_en, product.name_ar);
  const description = getName(locale, product.description_en || '', product.description_ar || '');

  const handleAdd = (withNotes: string) => {
    if (!product.is_available) return;
    addItem({
      productId: product.id,
      name_en: product.name_en,
      name_ar: product.name_ar,
      image_url: product.image_url,
      dining_price: product.dining_price,
      takeaway_price: product.takeaway_price,
      quantity: qty,
      notes: withNotes,
    });
    trackAddToCart(product.id, qty, diningMode);
    setPulse(true);
    window.setTimeout(() => setPulse(false), 400);
    setQty(1);
    setNotes('');
    setNotesOpen(false);
    onAddedToCart?.();
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const startLongPress = () => {
    longPressFired.current = false;
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setNotesOpen(true);
    }, 500);
  };

  const handleMobileAddClick = () => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    handleAdd('');
  };

  return (
    <article
      className={cn(
        'border-aklet-line/70 bg-aklet-paper-soft group relative flex h-full flex-col overflow-hidden rounded-xl border transition-shadow',
        'hover:shadow-[0_10px_30px_-18px_rgba(18,26,29,0.45)]',
        !product.is_available && 'opacity-70'
      )}
      data-testid="product-card"
    >
      <div className="bg-aklet-sand/50 relative aspect-square w-full overflow-hidden">
        <button
          type="button"
          className="absolute inset-0 z-0 h-full w-full"
          onClick={() => onImageClick(product)}
          aria-label={productName}
        >
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={productName}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              containerClassName="absolute inset-0 h-full w-full"
            />
          ) : (
            <span className="text-aklet-ink-soft/40 font-heading absolute inset-0 flex items-center justify-center text-3xl">
              {productName.charAt(0)}
            </span>
          )}
        </button>

        <div className="pointer-events-none absolute start-2 top-2 z-[1] flex flex-wrap gap-1">
          <ProductBadges product={product} />
        </div>

        <motion.button
          type="button"
          whileTap={prefersReducedMotion ? undefined : { scale: 0.85 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product);
          }}
          className={cn(
            'absolute end-1.5 top-1.5 z-[2] flex h-9 w-9 items-center justify-center rounded-full transition-colors',
            isFavorite
              ? 'bg-aklet-coral-cta text-white'
              : 'text-aklet-ink bg-aklet-paper/80 backdrop-blur-sm'
          )}
          aria-label={isFavorite ? t('removeFavorite') : t('addFavorite')}
          aria-pressed={isFavorite}
        >
          <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} aria-hidden />
        </motion.button>

        {product.is_available && (
          <motion.button
            type="button"
            whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
            animate={pulse && !prefersReducedMotion ? { scale: [1, 1.1, 1] } : { scale: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onPointerDown={startLongPress}
            onPointerUp={clearLongPress}
            onPointerLeave={clearLongPress}
            onPointerCancel={clearLongPress}
            onClick={(e) => {
              e.stopPropagation();
              handleMobileAddClick();
            }}
            className="bg-aklet-coral-cta absolute bottom-2 end-2 z-[2] flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md sm:hidden"
            aria-label={tCart('addToCart')}
            data-testid="add-to-cart-mobile"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </motion.button>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-2.5 sm:p-3">
        <button
          type="button"
          className="block w-full text-start"
          onClick={() => onImageClick(product)}
        >
          <h3 className="font-heading text-aklet-ink line-clamp-1 text-[13px] font-bold leading-snug sm:text-sm">
            {productName}
          </h3>
          {description ? (
            <p className="text-aklet-ink-soft mt-1 line-clamp-1 text-[11px] leading-relaxed sm:text-xs">
              {description}
            </p>
          ) : null}
        </button>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <p className="text-aklet-price text-sm font-bold tabular-nums sm:text-[15px]" dir="ltr">
            {formatCurrencyAmount(activePrice, currency, { locale: currencyLocale })}
          </p>
          {otherPrice !== activePrice && (
            <p className="text-aklet-ink-soft hidden text-[11px] tabular-nums sm:inline" dir="auto">
              {diningMode === 'dining' ? tCart('takeawayPrice') : tCart('diningPrice')}{' '}
              {formatCurrencyAmount(otherPrice, currency, { locale: currencyLocale })}
            </p>
          )}
          {!product.is_available && (
            <span className="text-aklet-ink-soft border-aklet-line rounded-full border px-2 py-0.5 text-[10px]">
              {t('currentlyUnavailable')}
            </span>
          )}
        </div>

        {product.is_available && (
          <div className="mt-2.5 hidden flex-col gap-1.5 sm:flex">
            <div className="flex items-stretch gap-2">
              <div
                className="border-aklet-line/80 bg-aklet-paper inline-flex h-10 shrink-0 items-stretch overflow-hidden rounded-lg border"
                role="group"
                aria-label={tCart('quantity')}
              >
                <button
                  type="button"
                  className="text-aklet-ink hover:bg-aklet-sand/70 flex w-8 items-center justify-center transition-colors disabled:pointer-events-none disabled:opacity-40"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label={tCart('decreaseQty')}
                  disabled={qty <= 1}
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden />
                </button>
                <span
                  className="border-aklet-line/80 flex min-w-7 items-center justify-center border-x text-xs font-semibold tabular-nums"
                  aria-live="polite"
                  aria-label={tCart('quantity')}
                >
                  {qty}
                </span>
                <button
                  type="button"
                  className="text-aklet-ink hover:bg-aklet-sand/70 flex w-8 items-center justify-center transition-colors"
                  onClick={() => setQty((q) => q + 1)}
                  aria-label={tCart('increaseQty')}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
              <motion.div
                className="min-w-0 flex-1"
                animate={pulse && !prefersReducedMotion ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <Button
                  type="button"
                  className="bg-aklet-coral-cta hover:bg-aklet-coral-cta/90 h-10 w-full rounded-lg text-xs font-semibold text-white"
                  onClick={() => handleAdd('')}
                  data-testid="add-to-cart"
                  aria-label={tCart('addToCart')}
                >
                  {tCart('addToCart')}
                </Button>
              </motion.div>
            </div>
            <button
              type="button"
              className="text-aklet-ink-soft hover:text-aklet-ink self-start text-[11px] underline-offset-2 transition-colors hover:underline"
              onClick={() => setNotesOpen(true)}
            >
              {tCart('itemNotes')}
            </button>
          </div>
        )}
      </div>

      <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tCart('itemNotes')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`product-notes-${product.id}`}>{productName}</Label>
            <Input
              id={`product-notes-${product.id}`}
              value={notes}
              maxLength={maxNotes}
              placeholder={tCart('itemNotesPlaceholder')}
              onChange={(e) => setNotes(e.target.value)}
              autoComplete="off"
            />
            <p className="text-aklet-ink-soft text-xs tabular-nums">
              {notes.length}/{maxNotes}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNotesOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              type="button"
              className="bg-aklet-coral-cta hover:bg-aklet-coral-cta/90 text-white"
              onClick={() => handleAdd(notes)}
            >
              {tCart('addToCart')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
