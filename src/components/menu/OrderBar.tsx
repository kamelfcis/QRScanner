'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useClientMounted } from '@/hooks/useClientMounted';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getCartLineUnitPrice } from '@/lib/order/totals';
import {
  formatCurrencyAmount,
  getRestaurantCurrency,
  toCurrencyLocale,
} from '@/lib/order/format-currency';
import { isAlaKeefakTenant } from '@/i18n/config';
import { cn } from '@/lib/utils';

interface OrderBarProps {
  onOpenCart: () => void;
}

/**
 * Phone-only sticky order bar. Replaces the centre floating button so it can
 * carry the running total and never collide with the category rail.
 */
export function OrderBar({ onOpenCart }: OrderBarProps) {
  const mounted = useClientMounted();
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useI18n();
  const tCart = useTranslations('cart');
  const { data: settings } = useRestaurantSettings();

  const items = useCartStore((s) => s.items);
  const diningMode = useCartStore((s) => s.diningMode);

  const count = items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = items.reduce(
    (sum, i) => sum + getCartLineUnitPrice(i, diningMode) * i.quantity,
    0
  );

  const currency = getRestaurantCurrency(settings?.currency);
  const currencyLocale = toCurrencyLocale(locale);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={prefersReducedMotion ? undefined : { y: 72, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 48, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'fixed z-40 md:hidden',
            isAlaKeefakTenant
              ? 'inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))]'
              : 'inset-x-0 bottom-0 border-t border-[var(--menu-line)] bg-[var(--menu-surface)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3'
          )}
        >
          <div
            className={cn(
              isAlaKeefakTenant &&
                'rounded-2xl border border-[var(--menu-line)] bg-[var(--menu-surface)] p-2'
            )}
          >
            {isAlaKeefakTenant ? <span className="ember-line mb-2" aria-hidden /> : null}
            <button
              type="button"
              onClick={onOpenCart}
              aria-label={tCart('openCart')}
              data-testid="cart-fab"
              className="flex h-14 min-h-11 w-full touch-manipulation items-center justify-between gap-3 rounded-full bg-[var(--menu-wine)] px-4 py-3 text-[var(--menu-on-wine)] transition-transform duration-150 active:scale-[0.98] motion-reduce:active:scale-100"
            >
              <span className="flex items-center gap-2.5">
                <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-[var(--menu-on-wine-wash)]">
                  <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold" aria-live="polite">
                  {isAlaKeefakTenant ? tCart('checkout') : tCart('viewOrder')}
                </span>
                <span
                  key={count}
                  className="cart-badge-pop rounded-full bg-[var(--menu-on-wine-wash)] px-2 py-0.5 text-[11px] font-semibold tabular-nums"
                >
                  {count}
                </span>
              </span>
              <span className="text-sm font-semibold tabular-nums" dir="ltr">
                {formatCurrencyAmount(subtotal, currency, { locale: currencyLocale })}
              </span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
