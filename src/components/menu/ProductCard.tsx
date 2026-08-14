'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Minus, Plus, Sparkles, Star, ShoppingCart } from 'lucide-react';
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
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useMenuSettings } from '@/components/menu/MenuSettingsProvider';
import { useCartStore } from '@/stores/cart-store';
import { trackAddToCart } from '@/lib/analytics';
import { formatCurrencyAmount } from '@/lib/order/format-currency';
import { getCategoryImageFit, type MarketCategoryKind } from '@/lib/market/catalog';
import { parseUnitLabel } from '@/lib/market/units';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { cn, getName } from '@/lib/utils';
import type { Product } from '@/types/database';

interface ProductCardProps {
  product: Product;
  diningMode: 'dining' | 'takeaway';
  categoryKind: MarketCategoryKind;
  isFavorite: boolean;
  onToggleFavorite: (product: Product) => void;
  onOpenDetails: (product: Product) => void;
  onAddedToCart?: () => void;
}

export function ProductCard({
  product,
  diningMode,
  categoryKind,
  isFavorite,
  onToggleFavorite,
  onOpenDetails,
  onAddedToCart,
}: ProductCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useI18n();
  const t = useTranslations('menu');
  const tCart = useTranslations('cart');
  const tCommon = useTranslations('common');
  const { settings, currency } = useMenuSettings();
  const addItem = useCartStore((s) => s.addItem);

  const [qty, setQty] = useState(1);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [pulse, setPulse] = useState(false);

  const currencyLocale = locale === 'ar' ? 'ar' : 'en';
  const maxNotes = settings?.max_order_notes_length ?? 200;
  const price = diningMode === 'dining' ? product.dining_price : product.takeaway_price;
  const productName = getName(locale, product.name_en, product.name_ar);
  const unitLabel = parseUnitLabel(product.description_ar, product.description_en, currencyLocale);
  const imageFit = getCategoryImageFit(categoryKind);

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
    window.setTimeout(() => setPulse(false), 350);
    setQty(1);
    setNotes('');
    setNotesOpen(false);
    onAddedToCart?.();
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[var(--hm-radius)] border border-[var(--hm-line)] bg-[var(--hm-surface)] shadow-[var(--hm-shadow-card)] transition-colors hover:border-[var(--hm-line-strong)]">
      <div
        className={cn(
          'relative aspect-square w-full overflow-hidden',
          imageFit === 'contain' ? 'bg-white' : 'bg-[var(--hm-surface-muted)]'
        )}
      >
        <button
          type="button"
          className="absolute inset-0 z-0"
          onClick={() => onOpenDetails(product)}
          aria-label={productName}
        >
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={productName}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className={cn(
                'transition-transform duration-300 motion-reduce:transition-none',
                imageFit === 'contain'
                  ? 'object-contain p-3'
                  : 'object-cover group-hover:scale-[1.03] motion-reduce:group-hover:scale-100'
              )}
              containerClassName="absolute inset-0 h-full w-full"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--hm-surface-muted)]">
              <span className="font-heading text-2xl text-[var(--hm-ink-faint)]">
                {productName.charAt(0)}
              </span>
            </div>
          )}
        </button>

        <div className="pointer-events-none absolute start-1.5 top-1.5 z-[1] flex flex-col items-start gap-1">
          {product.is_bestseller ? (
            <Badge className="bg-[var(--hm-accent)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--hm-on-accent)]">
              <Star className="me-0.5 h-2.5 w-2.5" aria-hidden="true" />
              {t('bestseller')}
            </Badge>
          ) : product.is_popular ? (
            <Badge className="bg-[var(--hm-primary)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
              <Star className="me-0.5 h-2.5 w-2.5" aria-hidden="true" />
              {t('popular')}
            </Badge>
          ) : null}
          {product.is_new && (
            <Badge className="bg-[var(--hm-ink)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
              <Sparkles className="me-0.5 h-2.5 w-2.5" aria-hidden="true" />
              {t('new')}
            </Badge>
          )}
        </div>

        <motion.button
          type="button"
          whileTap={prefersReducedMotion ? undefined : { scale: 0.85 }}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(product);
          }}
          className={cn(
            'absolute end-1.5 top-1.5 z-[2] flex h-8 w-8 items-center justify-center rounded-full border transition-colors',
            isFavorite
              ? 'border-transparent bg-red-500 text-white'
              : 'border-[var(--hm-line)] bg-white/90 text-[var(--hm-ink-soft)] backdrop-blur-sm'
          )}
          aria-label={isFavorite ? t('removeFavorite') : t('addFavorite')}
          aria-pressed={isFavorite}
        >
          <Heart className={cn('h-3.5 w-3.5', isFavorite && 'fill-current')} aria-hidden="true" />
        </motion.button>

        {!product.is_available && (
          <div className="absolute inset-0 z-[1] flex items-end justify-center bg-white/70 p-2">
            <Badge variant="secondary" className="text-[10px]">
              {t('currentlyUnavailable')}
            </Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <button
          type="button"
          className="block w-full text-start"
          onClick={() => onOpenDetails(product)}
        >
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-[var(--hm-ink)] sm:text-sm">
            {productName}
          </h3>
        </button>

        {unitLabel && (
          <span
            className="inline-flex w-fit items-center rounded-full border border-[var(--hm-line)] bg-[var(--hm-surface-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--hm-ink-soft)]"
            dir="auto"
          >
            {unitLabel}
          </span>
        )}

        <p
          className="mt-auto pt-0.5 text-[15px] font-bold tabular-nums text-[var(--hm-price)]"
          dir="ltr"
        >
          {formatCurrencyAmount(price, currency, { locale: currencyLocale })}
        </p>

        {product.is_available && (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-stretch">
              <div
                className="inline-flex h-9 shrink-0 items-stretch overflow-hidden rounded-[var(--hm-radius-sm)] border border-[var(--hm-line-strong)] bg-[var(--hm-surface)]"
                role="group"
                aria-label={tCart('quantity')}
              >
                <button
                  type="button"
                  className="flex w-8 items-center justify-center text-[var(--hm-ink)] transition-colors hover:bg-[var(--hm-surface-muted)] disabled:pointer-events-none disabled:opacity-40"
                  onClick={() => setQty((current) => Math.max(1, current - 1))}
                  aria-label={tCart('decreaseQty')}
                  disabled={qty <= 1}
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <span
                  className="flex min-w-7 items-center justify-center border-x border-[var(--hm-line-strong)] px-1 text-xs font-semibold tabular-nums text-[var(--hm-ink)]"
                  aria-live="polite"
                  aria-label={tCart('quantity')}
                >
                  {qty}
                </span>
                <button
                  type="button"
                  className="flex w-8 items-center justify-center text-[var(--hm-ink)] transition-colors hover:bg-[var(--hm-surface-muted)]"
                  onClick={() => setQty((current) => current + 1)}
                  aria-label={tCart('increaseQty')}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>

              <motion.div
                className="min-w-0 flex-1"
                animate={pulse && !prefersReducedMotion ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <Button
                  type="button"
                  className="h-9 w-full rounded-[var(--hm-radius-sm)] bg-[var(--hm-accent)] px-2 text-xs font-semibold text-[var(--hm-on-accent)] hover:bg-[var(--hm-accent-strong)]"
                  onClick={() => handleAdd('')}
                  data-testid="add-to-cart"
                  aria-label={tCart('addToCart')}
                >
                  <ShoppingCart className="me-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  {tCart('add')}
                </Button>
              </motion.div>
            </div>

            <button
              type="button"
              className="w-fit text-[11px] text-[var(--hm-ink-faint)] underline-offset-2 transition-colors hover:text-[var(--hm-primary)] hover:underline"
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
              onChange={(event) => setNotes(event.target.value)}
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
    </article>
  );
}
