'use client';

import { Sparkles } from 'lucide-react';
import { Image } from '@/components/shared/Image';
import { MotionSection } from '@/components/shared/motion';
import { usePopularProducts } from '@/hooks/useProducts';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getName } from '@/lib/utils';
import { formatCurrencyAmount, getRestaurantCurrency } from '@/lib/order/format-currency';

interface RecommendedDishesProps {
  onSelectProduct: (productId: string) => void;
}

export function RecommendedDishes({ onSelectProduct }: RecommendedDishesProps) {
  const { data: products, isLoading } = usePopularProducts();
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useI18n();
  const t = useTranslations('menu');
  const { data: settings } = useRestaurantSettings();
  const currency = getRestaurantCurrency(settings?.currency);
  const currencyLocale = locale === 'ar' ? 'ar' : 'en';

  if (isLoading || !products?.length) return null;

  return (
    <MotionSection className="mx-auto max-w-6xl px-3 py-6 sm:px-5">
      <div className="mb-3 flex items-center gap-3">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--menu-gold)]" aria-hidden="true" />
        <h2 className="font-heading text-base font-semibold text-[var(--menu-ink)] sm:text-lg">
          {t('recommended')}
        </h2>
        <span aria-hidden className="menu-rule h-px flex-1" />
      </div>
      <motion.div
        initial={prefersReducedMotion ? undefined : 'hidden'}
        whileInView="visible"
        viewport={{ once: true }}
        variants={prefersReducedMotion ? undefined : staggerContainer}
        className="scrollbar-none flex gap-3 overflow-x-auto pb-2"
      >
        {products.map((product) => {
          const name = getName(locale, product.name_en, product.name_ar);
          return (
            <motion.button
              key={product.id}
              variants={prefersReducedMotion ? undefined : staggerItem}
              onClick={() => onSelectProduct(product.id)}
              className="flex min-w-[170px] shrink-0 overflow-hidden rounded-lg border border-[var(--menu-line)] bg-[var(--menu-surface)] text-start transition-colors hover:border-[var(--menu-gold-soft)]"
            >
              {product.image_url && (
                <div className="relative h-24 w-24 shrink-0 overflow-hidden">
                  <Image
                    src={product.image_url}
                    alt={name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
              )}
              <div className="flex min-w-0 flex-col justify-center p-3">
                <h4 className="font-heading line-clamp-1 text-[13px] font-semibold text-[var(--menu-ink)]">
                  {name}
                </h4>
                {locale !== 'ar' && product.name_ar && (
                  <p
                    className="mt-0.5 line-clamp-1 text-[11px] text-[var(--menu-ink-soft)]"
                    dir="rtl"
                  >
                    {product.name_ar}
                  </p>
                )}
                <p
                  className="mt-1 text-sm font-semibold tabular-nums text-[var(--menu-wine)]"
                  dir="ltr"
                >
                  {formatCurrencyAmount(product.dining_price, currency, { locale: currencyLocale })}
                </p>
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </MotionSection>
  );
}
