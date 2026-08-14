'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { useCartCount } from '@/hooks/useCartCount';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useCartStore, type CartDiningMode } from '@/stores/cart-store';
import { calculateOrderTotals, getUnitPrice } from '@/lib/order/totals';
import { formatCurrencyAmount, getRestaurantCurrency } from '@/lib/order/format-currency';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';

interface OrderBarProps {
  diningMode: CartDiningMode;
  onOpenCart: () => void;
}

/** Sticky mobile order bar: line count, running total, and a way into the cart. */
export function OrderBar({ diningMode, onOpenCart }: OrderBarProps) {
  const cartCount = useCartCount();
  const items = useCartStore((s) => s.items);
  const { data: settings } = useRestaurantSettings();
  const { locale } = useI18n();
  const tCart = useTranslations('cart');
  const prefersReducedMotion = useReducedMotion();

  const currency = getRestaurantCurrency(settings?.currency);
  const currencyLocale = locale === 'ar' ? 'ar' : 'en';
  const totals = calculateOrderTotals(
    items.map((item) => ({
      quantity: item.quantity,
      unitPrice: getUnitPrice(item.dining_price, item.takeaway_price, diningMode),
    })),
    settings
  );

  return (
    <AnimatePresence>
      {cartCount > 0 && (
        <motion.div
          initial={prefersReducedMotion ? undefined : { y: 90 }}
          animate={{ y: 0 }}
          exit={{ y: 90 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--hm-line)] bg-[var(--hm-surface)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-18px_rgba(27,31,35,0.5)] md:hidden"
        >
          <button
            type="button"
            onClick={onOpenCart}
            className="flex h-12 w-full items-center justify-between gap-3 rounded-[var(--hm-radius)] bg-[var(--hm-primary)] px-4 text-white"
            data-testid="order-bar"
            aria-label={tCart('openCart')}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              <span aria-live="polite" className="tabular-nums">
                {tCart('cartCount', { count: cartCount })}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-sm font-bold tabular-nums" dir="ltr">
                {formatCurrencyAmount(totals.subtotal, currency, { locale: currencyLocale })}
              </span>
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
                {tCart('viewCart')}
              </span>
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
