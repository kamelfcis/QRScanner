'use client';

import { Clock, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Image } from '@/components/shared/Image';
import { MotionSection } from '@/components/shared/motion';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getName } from '@/lib/utils';
import { formatCurrencyAmount, getRestaurantCurrency } from '@/lib/order/format-currency';

interface RecentlyViewedProps {
  onSelectProduct: (productId: string) => void;
}

export function RecentlyViewed({ onSelectProduct }: RecentlyViewedProps) {
  const { recent, clearRecent } = useRecentlyViewed();
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useI18n();
  const t = useTranslations('menu');
  const { data: settings } = useRestaurantSettings();
  const currency = getRestaurantCurrency(settings?.currency);
  const currencyLocale = locale === 'ar' ? 'ar' : 'en';

  if (!recent.length) return null;

  return (
    <MotionSection className="mx-auto max-w-7xl px-3 py-4 sm:px-4">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="font-heading flex items-center gap-2 text-base font-bold text-[var(--hm-ink)] sm:text-lg">
          <Clock className="h-4.5 w-4.5 text-[var(--hm-primary)]" aria-hidden="true" />
          {t('recentlyViewed')}
        </h2>
        <button
          type="button"
          onClick={clearRecent}
          className="inline-flex items-center gap-1 text-xs text-[var(--hm-ink-faint)] transition-colors hover:text-[var(--hm-ink)]"
        >
          <X className="h-3 w-3" aria-hidden="true" />
          {t('clear')}
        </button>
      </div>

      <motion.div
        initial={prefersReducedMotion ? undefined : 'hidden'}
        whileInView="visible"
        viewport={{ once: true }}
        variants={prefersReducedMotion ? undefined : staggerContainer}
        className="scrollbar-none -mx-3 flex gap-2.5 overflow-x-auto px-3 pb-1 sm:-mx-4 sm:px-4"
      >
        {recent.map((product) => {
          const name = getName(locale, product.name_en, product.name_ar);
          return (
            <motion.button
              key={product.id}
              type="button"
              variants={prefersReducedMotion ? undefined : staggerItem}
              onClick={() => onSelectProduct(product.id)}
              className="flex w-[188px] shrink-0 items-center gap-2.5 overflow-hidden rounded-[var(--hm-radius)] border border-[var(--hm-line)] bg-[var(--hm-surface)] p-2 text-start transition-colors hover:border-[var(--hm-primary)]"
            >
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[var(--hm-radius-sm)] bg-white">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={name}
                    fill
                    className="object-contain p-1"
                    sizes="56px"
                    containerClassName="absolute inset-0 h-full w-full"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-sm text-[var(--hm-ink-faint)]">
                    {name.charAt(0)}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-xs font-medium text-[var(--hm-ink)]">
                  {name}
                </span>
                <span
                  className="mt-0.5 block text-xs font-bold tabular-nums text-[var(--hm-price)]"
                  dir="ltr"
                >
                  {formatCurrencyAmount(product.takeaway_price, currency, {
                    locale: currencyLocale,
                  })}
                </span>
              </span>
            </motion.button>
          );
        })}
      </motion.div>
    </MotionSection>
  );
}
