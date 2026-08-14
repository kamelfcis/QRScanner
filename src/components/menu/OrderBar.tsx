'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useClientMounted } from '@/hooks/useClientMounted';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getUnitPrice } from '@/lib/order/totals';
import { formatCurrencyAmount, getRestaurantCurrency } from '@/lib/order/format-currency';

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
    (sum, i) => sum + getUnitPrice(i.dining_price, i.takeaway_price, diningMode) * i.quantity,
    0
  );

  const currency = getRestaurantCurrency(settings?.currency);
  const currencyLocale = locale === 'ar' ? 'ar' : 'en';

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={prefersReducedMotion ? undefined : { y: 72, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 48, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t border-[var(--menu-line)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md md:hidden"
        >
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={tCart('openCart')}
            data-testid="cart-fab"
            className="flex h-[3.25rem] w-full items-center justify-between gap-3 rounded-full bg-[var(--menu-wine)] px-4 py-3 text-[#FDF7F0] shadow-[0_6px_20px_-10px_rgba(107,15,26,0.9)]"
          >
            <span className="flex items-center gap-2.5">
              <span className="bg-[#FDF7F0]/16 relative flex h-7 w-7 items-center justify-center rounded-full">
                <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold" aria-live="polite">
                {tCart('viewOrder')}
              </span>
              <span className="bg-[#FDF7F0]/18 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums">
                {count}
              </span>
            </span>
            <span className="text-sm font-semibold tabular-nums" dir="ltr">
              {formatCurrencyAmount(subtotal, currency, { locale: currencyLocale })}
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
