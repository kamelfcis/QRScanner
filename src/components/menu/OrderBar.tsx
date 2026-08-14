'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
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
 * Phone-only order bar: count, running total, one target. Replaces the centre
 * floating pill that used to sit on top of the last row of cards.
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
          className="bg-aklet-paper/95 border-aklet-line/70 fixed inset-x-0 bottom-0 z-40 border-t px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md md:hidden"
        >
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={tCart('openCart')}
            data-testid="cart-fab"
            className="bg-aklet-ink text-aklet-paper flex h-12 w-full items-center justify-between gap-3 rounded-xl px-4"
          >
            <span className="flex items-center gap-2.5">
              <span className="bg-aklet-coral-cta relative flex h-7 w-7 items-center justify-center rounded-full text-white">
                <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="text-sm font-semibold" aria-live="polite">
                {tCart('cartCount', { count })}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-sm font-bold tabular-nums" dir="ltr">
                {formatCurrencyAmount(subtotal, currency, { locale: currencyLocale })}
              </span>
              <span className="text-aklet-coral text-xs font-semibold">{tCart('viewOrder')}</span>
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
