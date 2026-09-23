'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCartStore } from '@/stores/cart-store';
import { calculateOrderTotals, getCartLineUnitPrice } from '@/lib/order/totals';
import {
  formatCurrencyAmount,
  getRestaurantCurrency,
  toCurrencyLocale,
} from '@/lib/order/format-currency';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { cn, getName } from '@/lib/utils';
import { trackCheckoutStart } from '@/lib/analytics';
import { haptic } from '@/lib/haptics';
import { playSound } from '@/lib/ux/sound';
import { triggerHaptic } from '@/lib/ux/haptic';
import { Image } from '@/components/shared/Image';
import { RepeatLastOrderButton } from '@/components/menu/RepeatLastOrderButton';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { CartItem } from '@/stores/cart-store';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const stepperButton =
  'flex h-11 w-11 min-h-11 min-w-11 touch-manipulation items-center justify-center text-[var(--menu-ink)] transition-transform duration-150 hover:bg-[var(--menu-gold-wash)] active:scale-95 motion-reduce:active:scale-100';

const REMOVE_FADE_MS = 180;

interface CartLineProps {
  item: CartItem & { unitPrice: number };
  currency: string;
  currencyLocale: string;
  maxNotes: number;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
  onNotesChange: (notes: string) => void;
}

function CartLine({
  item,
  currency,
  currencyLocale,
  maxNotes,
  onDecrease,
  onIncrease,
  onRemove,
  onNotesChange,
}: CartLineProps) {
  const { locale } = useI18n();
  const t = useTranslations('cart');
  const prefersReducedMotion = useReducedMotion();
  const [fadingOut, setFadingOut] = useState(false);

  const name = getName(locale, item.name_en, item.name_ar, item.name_fr, item.name_nl);
  const lineTotal = item.unitPrice * item.quantity;

  const fadeThen = useCallback(
    (action: () => void) => {
      if (prefersReducedMotion) {
        action();
        return;
      }
      setFadingOut(true);
      window.setTimeout(action, REMOVE_FADE_MS);
    },
    [prefersReducedMotion]
  );

  const handleDecrease = () => {
    if (item.quantity <= 1) {
      fadeThen(onRemove);
      return;
    }
    onDecrease();
  };

  return (
    <motion.div
      layout={!prefersReducedMotion}
      animate={
        prefersReducedMotion
          ? { opacity: fadingOut ? 0 : 1 }
          : { opacity: fadingOut ? 0 : 1, y: fadingOut ? 10 : 0 }
      }
      transition={{ duration: prefersReducedMotion ? 0 : REMOVE_FADE_MS / 1000 }}
      className="flex gap-3 border-b border-[var(--menu-line)] py-3.5 last:border-0"
      data-testid="cart-line"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--menu-paper-deep)]">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={name}
            fill
            sizes="64px"
            className="object-cover"
            containerClassName="absolute inset-0"
          />
        ) : (
          <div className="font-heading flex h-full items-center justify-center text-lg text-[var(--menu-gold-faint)]">
            {name.charAt(0)}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--menu-ink)]">
              {name}
              {item.has_size_options && item.sizeOption ? (
                <span className="ms-1.5 inline-flex rounded-full bg-[var(--menu-gold-wash)] px-2 py-0.5 text-[10px] font-medium text-[var(--menu-ink-soft)]">
                  {item.sizeOption === 'small' ? t('small') : t('large')}
                </span>
              ) : null}
            </p>
            <p
              className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--menu-wine)]"
              dir="ltr"
            >
              {formatCurrencyAmount(lineTotal, currency, { locale: currencyLocale })}
            </p>
          </div>
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--menu-ink-soft)] transition-colors hover:bg-[var(--menu-gold-wash)] hover:text-[var(--menu-wine)]"
            onClick={() => fadeThen(onRemove)}
            aria-label={t('removeItem')}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <div
            className="inline-flex items-stretch overflow-hidden rounded-full border border-[var(--menu-line-strong)]"
            role="group"
            aria-label={t('quantity')}
          >
            <button
              type="button"
              className={stepperButton}
              onClick={handleDecrease}
              aria-label={t('decreaseQty')}
            >
              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <span
              className="flex min-w-7 items-center justify-center text-sm font-medium tabular-nums"
              aria-live="polite"
            >
              {item.quantity}
            </span>
            <button
              type="button"
              className={stepperButton}
              onClick={onIncrease}
              aria-label={t('increaseQty')}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mt-2">
          <Label htmlFor={`notes-${item.id}`} className="sr-only">
            {t('editNotes')}
          </Label>
          <Input
            id={`notes-${item.id}`}
            value={item.notes}
            maxLength={maxNotes}
            placeholder={t('itemNotesPlaceholder')}
            onChange={(e) => onNotesChange(e.target.value)}
            className="h-9 rounded-lg bg-[var(--menu-paper)] text-xs"
          />
        </div>
      </div>
    </motion.div>
  );
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const { locale } = useI18n();
  const t = useTranslations('cart');
  const tCommon = useTranslations('accessibility');
  const { data: settings } = useRestaurantSettings();
  const items = useCartStore((s) => s.items);
  const diningMode = useCartStore((s) => s.diningMode);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const setItemNotes = useCartStore((s) => s.setItemNotes);

  const currency = getRestaurantCurrency(settings?.currency);
  const currencyLocale = toCurrencyLocale(locale);
  const isRtl = locale === 'ar';
  const side = isDesktop ? (isRtl ? 'left' : 'right') : 'bottom';

  const pricedItems = items.map((item) => ({
    ...item,
    unitPrice: getCartLineUnitPrice(item, diningMode),
  }));
  const totals = calculateOrderTotals(
    pricedItems.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })),
    settings
  );
  const count = items.reduce((n, i) => n + i.quantity, 0);

  const handleCheckout = () => {
    trackCheckoutStart(count, totals.total);
    onOpenChange(false);
    router.push('/checkout');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        showCloseButton={false}
        className={
          side === 'bottom'
            ? 'max-h-[88svh] gap-0 rounded-t-2xl bg-[var(--menu-surface)] p-0'
            : 'w-full gap-0 bg-[var(--menu-surface)] p-0 sm:max-w-md'
        }
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label={tCommon('close')}
          className="absolute end-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full text-[var(--menu-ink-soft)] transition-colors hover:bg-[var(--menu-gold-wash)] hover:text-[var(--menu-ink)]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="flex max-h-[88svh] flex-col overflow-hidden md:h-full md:max-h-none">
          <div className="border-b border-[var(--menu-line)] pb-3 pe-16 ps-4 pt-4">
            <SheetTitle className="font-heading text-lg font-semibold text-[var(--menu-ink)]">
              {t('title')}
            </SheetTitle>
            <SheetDescription className="text-xs text-[var(--menu-ink-soft)]">
              {count > 0 ? t('itemsInOrder', { count }) : t('emptyDescription')}
            </SheetDescription>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-14 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--menu-line-strong)] bg-[var(--menu-paper)]">
                <ShoppingBag className="h-6 w-6 text-[var(--menu-gold)]" aria-hidden="true" />
              </span>
              <p className="font-heading text-base font-semibold">{t('empty')}</p>
              <p className="max-w-[32ch] text-sm text-[var(--menu-ink-soft)]">
                {t('emptyDescription')}
              </p>
              <Link
                href="/menu"
                onClick={() => onOpenChange(false)}
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  'mt-1 h-11 min-h-11 rounded-full px-6'
                )}
                data-testid="cart-empty-menu"
              >
                {t('browseMenu')}
              </Link>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {pricedItems.map((item) => (
                  <CartLine
                    key={item.id}
                    item={item}
                    currency={currency}
                    currencyLocale={currencyLocale}
                    maxNotes={settings?.max_order_notes_length ?? 200}
                    onDecrease={() => {
                      triggerHaptic('light');
                      playSound('add');
                      updateQty(item.id, item.quantity - 1);
                    }}
                    onIncrease={() => {
                      triggerHaptic('light');
                      playSound('add');
                      updateQty(item.id, item.quantity + 1);
                    }}
                    onRemove={() => {
                      haptic.remove();
                      removeItem(item.id);
                    }}
                    onNotesChange={(notes) => setItemNotes(item.id, notes)}
                  />
                ))}
              </div>

              <div className="border-t border-[var(--menu-line)] bg-[var(--menu-paper)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                <RepeatLastOrderButton
                  fullWidth
                  variant="outline"
                  className="mb-3 rounded-full border-[var(--menu-line-strong)]"
                />
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="text-[var(--menu-ink-soft)]">{t('subtotal')}</span>
                  <span
                    className="font-heading text-lg font-semibold tabular-nums text-[var(--menu-wine)]"
                    dir="ltr"
                  >
                    {formatCurrencyAmount(totals.subtotal, currency, { locale: currencyLocale })}
                  </span>
                </div>
                <Button
                  className="h-12 w-full rounded-full bg-[var(--menu-wine)] text-sm font-semibold text-[#FDF7F0] hover:bg-[var(--menu-wine-deep)]"
                  onClick={handleCheckout}
                  data-testid="cart-checkout"
                >
                  {t('checkout')}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
