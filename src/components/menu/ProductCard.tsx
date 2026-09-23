'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Minus, Plus, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { BadgePill, pickBadges } from '@/components/menu/ProductBadges';
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
  const badges = pickBadges(product);
  const productName = getName(locale, product.name_en, product.name_ar);
  const description = product.description_en
    ? getName(locale, product.description_en, product.description_ar)
    : '';

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
    <>
      <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-[var(--menu-line)] bg-[var(--menu-surface)] shadow-[0_1px_2px_rgba(33,29,24,0.04)] transition-shadow duration-300 hover:shadow-[0_8px_28px_-14px_rgba(33,29,24,0.28)]">
        <div className="relative aspect-square w-full overflow-hidden bg-[var(--menu-paper-deep)]">
          <button
            type="button"
            className="absolute inset-0 z-0 h-full w-full"
            onClick={() => onImageClick(product)}
            aria-label={`${t('viewDish')}: ${productName}`}
          >
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={productName}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition-transform duration-500 ease-out motion-reduce:transition-none sm:group-hover:scale-[1.04] motion-reduce:sm:group-hover:scale-100"
                containerClassName="absolute inset-0 h-full w-full"
              />
            ) : (
              <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-[radial-gradient(120%_100%_at_50%_0%,#ece2d2_0%,#ded1ba_100%)]">
                <span className="font-heading text-4xl text-[var(--menu-gold-faint)]">
                  {productName.charAt(0)}
                </span>
              </div>
            )}
          </button>

          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent"
          />

          <div className="pointer-events-none absolute start-2 top-2 z-[1] flex flex-wrap gap-1">
            {badges.map((badge, index) => (
              <BadgePill
                key={badge}
                badge={badge}
                className={index > 0 ? 'hidden sm:inline-flex' : undefined}
              />
            ))}
          </div>

          <motion.button
            type="button"
            whileTap={prefersReducedMotion ? undefined : { scale: 0.85 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(product);
            }}
            className={cn(
              'absolute end-2 top-2 z-[2] flex h-9 w-9 items-center justify-center rounded-full transition-colors',
              isFavorite
                ? 'bg-[var(--menu-wine)] text-[#FDF7F0]'
                : 'bg-[#FDF7F0]/90 text-[var(--menu-ink-soft)] backdrop-blur-[2px] hover:text-[var(--menu-wine)]'
            )}
            aria-label={isFavorite ? t('removeFavorite') : t('addFavorite')}
            aria-pressed={isFavorite}
          >
            <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} aria-hidden="true" />
          </motion.button>

          {!product.is_available && (
            <div className="bg-background/75 absolute inset-0 z-[1] flex items-center justify-center">
              <Badge
                variant="secondary"
                className="bg-[var(--menu-ink)] text-[11px] text-[var(--menu-paper)]"
              >
                {t('currentlyUnavailable')}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-3 sm:p-3.5">
          <button
            type="button"
            className="block w-full text-start"
            onClick={() => onImageClick(product)}
          >
            <h3 className="font-heading line-clamp-2 text-[13.5px] font-semibold leading-snug text-[var(--menu-ink)] sm:text-[15px]">
              {productName}
            </h3>
            {description && (
              <p className="mt-1 line-clamp-1 text-[11.5px] leading-relaxed text-[var(--menu-ink-soft)] sm:mt-1.5 sm:line-clamp-2 sm:text-xs">
                {description}
              </p>
            )}
          </button>

          <div className="mt-2.5 flex items-end justify-between gap-2 sm:mt-3">
            <div className="min-w-0">
              <p
                className="font-heading text-[15px] font-semibold tabular-nums text-[var(--menu-wine)] sm:text-base"
                dir="ltr"
              >
                {formatCurrencyAmount(activePrice, currency, { locale: currencyLocale })}
              </p>
              {otherPrice !== activePrice && (
                <p className="mt-0.5 hidden text-[10.5px] tabular-nums text-[var(--menu-ink-soft)] sm:block">
                  {diningMode === 'dining' ? tCart('takeawayPrice') : tCart('diningPrice')}:{' '}
                  {formatCurrencyAmount(otherPrice, currency, { locale: currencyLocale })}
                </p>
              )}
            </div>

            {product.is_available && (
              <motion.button
                type="button"
                whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
                animate={pulse && !prefersReducedMotion ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onPointerDown={startLongPress}
                onPointerUp={clearLongPress}
                onPointerLeave={clearLongPress}
                onPointerCancel={clearLongPress}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMobileAddClick();
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--menu-wine)] text-[#FDF7F0] shadow-[0_2px_10px_-4px_rgba(107,15,26,0.7)] sm:hidden"
                aria-label={tCart('addToCart')}
                data-testid="add-to-cart-mobile"
              >
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              </motion.button>
            )}
          </div>

          {product.is_available && (
            <div className="mt-3 hidden flex-col gap-1.5 sm:flex">
              <div className="flex items-stretch gap-2">
                <div
                  className="inline-flex h-10 shrink-0 items-stretch overflow-hidden rounded-full border border-[var(--menu-line-strong)] bg-[var(--menu-surface)]"
                  role="group"
                  aria-label={tCart('quantity')}
                >
                  <button
                    type="button"
                    className="flex w-9 items-center justify-center text-[var(--menu-ink)] transition-colors hover:bg-[var(--menu-gold-wash)] disabled:pointer-events-none disabled:opacity-40"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label={tCart('decreaseQty')}
                    disabled={qty <= 1}
                  >
                    <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <span
                    className="flex min-w-7 items-center justify-center text-center text-sm font-medium tabular-nums"
                    aria-live="polite"
                    aria-label={tCart('quantity')}
                  >
                    {qty}
                  </span>
                  <button
                    type="button"
                    className="flex w-9 items-center justify-center text-[var(--menu-ink)] transition-colors hover:bg-[var(--menu-gold-wash)]"
                    onClick={() => setQty((q) => q + 1)}
                    aria-label={tCart('increaseQty')}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>

                <motion.div
                  className="min-w-0 flex-1"
                  animate={pulse && !prefersReducedMotion ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <Button
                    type="button"
                    className="h-10 w-full rounded-full bg-[var(--menu-wine)] text-[13px] font-medium text-[#FDF7F0] hover:bg-[var(--menu-wine-deep)]"
                    onClick={() => handleAdd('')}
                    data-testid="add-to-cart"
                    aria-label={tCart('addToCart')}
                  >
                    <ShoppingCart className="me-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    {tCart('addToCart')}
                  </Button>
                </motion.div>
              </div>

              <button
                type="button"
                className="self-start text-[11px] text-[var(--menu-ink-soft)] underline-offset-4 transition-colors hover:text-[var(--menu-ink)] hover:underline"
                onClick={() => setNotesOpen(true)}
              >
                {tCart('itemNotes')}
              </button>
            </div>
          )}
        </div>
      </article>

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
            <p className="text-muted-foreground text-xs tabular-nums">
              {notes.length}/{maxNotes}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNotesOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="button" onClick={() => handleAdd(notes)}>
              {tCart('addToCart')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
