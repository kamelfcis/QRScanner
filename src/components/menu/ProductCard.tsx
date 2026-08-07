'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Flame, Star, Sparkles, Minus, Plus, ShoppingCart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import { MotionCard } from '@/components/shared/motion';
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

function pickBadges(product: Product) {
  const badges: Array<'popular' | 'new' | 'bestseller' | 'spicy'> = [];
  if (product.is_bestseller) badges.push('bestseller');
  else if (product.is_popular) badges.push('popular');
  if (product.is_new && badges.length < 2) badges.push('new');
  if (product.is_spicy && badges.length < 2) badges.push('spicy');
  return badges.slice(0, 2);
}

function BadgePill({
  badge,
  label,
  className,
}: {
  badge: 'popular' | 'new' | 'bestseller' | 'spicy';
  label: string;
  className?: string;
}) {
  if (badge === 'popular' || badge === 'bestseller') {
    return (
      <Badge
        className={cn(
          'text-brand-accent bg-black/55 px-1.5 py-0.5 text-[10px] backdrop-blur-sm sm:px-2.5 sm:py-0.5 sm:text-xs',
          className
        )}
      >
        <Star className="me-0.5 h-2.5 w-2.5 sm:me-1 sm:h-3 sm:w-3" aria-hidden="true" />
        {label}
      </Badge>
    );
  }
  if (badge === 'new') {
    return (
      <Badge
        className={cn(
          'bg-black/55 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-sm sm:px-2.5 sm:py-0.5 sm:text-xs',
          className
        )}
      >
        <Sparkles className="me-0.5 h-2.5 w-2.5 sm:me-1 sm:h-3 sm:w-3" aria-hidden="true" />
        {label}
      </Badge>
    );
  }
  return (
    <Badge
      className={cn(
        'bg-black/55 px-1.5 py-0.5 text-[10px] text-red-400 backdrop-blur-sm sm:px-2.5 sm:py-0.5 sm:text-xs',
        className
      )}
    >
      <Flame className="me-0.5 h-2.5 w-2.5 sm:me-1 sm:h-3 sm:w-3" aria-hidden="true" />
      {label}
    </Badge>
  );
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

  const badgeLabel = (badge: (typeof badges)[number]) => {
    if (badge === 'popular') return t('popular');
    if (badge === 'new') return t('new');
    if (badge === 'bestseller') return t('bestseller');
    return t('spicy');
  };

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
    <MotionCard hover className="overflow-hidden">
      <Card className="border-border/50 bg-card/80 relative overflow-hidden rounded-2xl border shadow-sm">
        <div className="relative aspect-square w-full overflow-hidden sm:aspect-[4/3]">
          <button
            type="button"
            className="absolute inset-0 z-0"
            onClick={() => onImageClick(product)}
            aria-label={productName}
          >
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={productName}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100"
                containerClassName="absolute inset-0 h-full w-full"
              />
            ) : (
              <div className="bg-muted absolute inset-0 flex h-full w-full items-center justify-center">
                <span className="font-heading text-muted-foreground/40 text-3xl">
                  {productName.charAt(0)}
                </span>
              </div>
            )}
          </button>

          <div className="pointer-events-none absolute start-2 top-2 z-[1] flex flex-wrap gap-1">
            {badges.map((badge, index) => (
              <BadgePill
                key={badge}
                badge={badge}
                label={badgeLabel(badge)}
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
              'absolute end-2 top-2 z-[2] flex h-9 w-9 items-center justify-center rounded-full transition-colors sm:h-11 sm:w-11',
              isFavorite
                ? 'bg-red-500 text-white'
                : 'bg-background/80 text-muted-foreground backdrop-blur-sm'
            )}
            aria-label={isFavorite ? t('removeFavorite') : t('addFavorite')}
            aria-pressed={isFavorite}
          >
            <Heart
              className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', isFavorite && 'fill-current')}
              aria-hidden="true"
            />
          </motion.button>

          {product.is_available && (
            <motion.button
              type="button"
              whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
              animate={pulse && !prefersReducedMotion ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onPointerDown={startLongPress}
              onPointerUp={clearLongPress}
              onPointerLeave={clearLongPress}
              onPointerCancel={clearLongPress}
              onClick={(e) => {
                e.stopPropagation();
                handleMobileAddClick();
              }}
              className="bg-brand-accent absolute bottom-2 end-2 z-[2] flex h-11 w-11 items-center justify-center rounded-full text-black shadow-md sm:hidden"
              aria-label={tCart('addToCart')}
              data-testid="add-to-cart-mobile"
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            </motion.button>
          )}
        </div>

        <CardContent className="p-2.5 sm:p-3.5">
          <button
            type="button"
            className="mb-1.5 block w-full text-start sm:mb-2"
            onClick={() => onImageClick(product)}
          >
            <h3 className="font-heading line-clamp-2 text-sm font-bold leading-snug sm:text-base">
              {productName}
            </h3>
            {locale !== 'ar' && product.name_ar && (
              <p className="text-muted-foreground mt-0.5 hidden text-xs sm:block" dir="rtl">
                {product.name_ar}
              </p>
            )}
            {locale === 'ar' && product.name_en && (
              <p className="text-muted-foreground mt-0.5 hidden text-xs sm:block" dir="ltr">
                {product.name_en}
              </p>
            )}
            {product.description_en && (
              <p className="text-muted-foreground mt-1.5 line-clamp-2 hidden text-xs sm:block">
                {getName(locale, product.description_en, product.description_ar)}
              </p>
            )}
          </button>

          <div className="mb-0 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 sm:mb-2.5">
            <p className="text-brand-accent text-sm font-bold tabular-nums sm:text-base" dir="ltr">
              {formatCurrencyAmount(activePrice, currency, { locale: currencyLocale })}
            </p>
            {otherPrice !== activePrice && (
              <p className="text-muted-foreground hidden text-xs tabular-nums sm:inline" dir="ltr">
                {diningMode === 'dining' ? tCart('takeawayPrice') : tCart('diningPrice')}:{' '}
                {formatCurrencyAmount(otherPrice, currency, { locale: currencyLocale })}
              </p>
            )}
            {!product.is_available && (
              <Badge variant="secondary" aria-label={t('currentlyUnavailable')}>
                {t('currentlyUnavailable')}
              </Badge>
            )}
          </div>

          {product.is_available && (
            <div className="mt-1.5 hidden flex-col gap-1 sm:flex">
              <div className="flex items-stretch gap-2">
                <div
                  className="border-border/60 bg-background inline-flex h-11 shrink-0 items-stretch overflow-hidden rounded-xl border"
                  role="group"
                  aria-label={tCart('quantity')}
                >
                  <button
                    type="button"
                    className="text-foreground hover:bg-muted flex w-10 items-center justify-center transition-colors disabled:pointer-events-none disabled:opacity-40"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label={tCart('decreaseQty')}
                    disabled={qty <= 1}
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span
                    className="border-border/60 flex min-w-8 items-center justify-center border-x px-1 text-center text-sm font-medium tabular-nums"
                    aria-live="polite"
                    aria-label={tCart('quantity')}
                  >
                    {qty}
                  </span>
                  <button
                    type="button"
                    className="text-foreground hover:bg-muted flex w-10 items-center justify-center transition-colors"
                    onClick={() => setQty((q) => q + 1)}
                    aria-label={tCart('increaseQty')}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <motion.div
                  className="min-w-0 flex-1"
                  animate={pulse && !prefersReducedMotion ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <Button
                    type="button"
                    className="bg-brand-accent hover:bg-brand-accent/90 h-11 w-full text-black"
                    onClick={() => handleAdd('')}
                    data-testid="add-to-cart"
                    aria-label={tCart('addToCart')}
                  >
                    <ShoppingCart className="me-2 h-4 w-4" aria-hidden="true" />
                    {tCart('addToCart')}
                  </Button>
                </motion.div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground h-7 justify-start px-0.5 text-xs font-normal"
                onClick={() => setNotesOpen(true)}
              >
                {tCart('itemNotes')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
    </MotionCard>
  );
}
