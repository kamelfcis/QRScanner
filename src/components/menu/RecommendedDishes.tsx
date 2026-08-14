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
    <MotionSection className="mx-auto max-w-6xl px-3 py-5 sm:px-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="text-aklet-coral h-4 w-4" aria-hidden />
        <h2 className="font-heading text-aklet-ink text-base font-bold sm:text-lg">
          {t('recommended')}
        </h2>
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
              className="border-aklet-line/70 bg-aklet-paper-soft flex min-w-[170px] shrink-0 overflow-hidden rounded-xl border text-start transition-shadow hover:shadow-md"
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
              <div className="flex flex-col justify-center p-3">
                <h4 className="text-aklet-ink line-clamp-1 text-sm font-semibold">{name}</h4>
                {locale !== 'ar' && product.name_ar && (
                  <p className="text-aklet-ink-soft mt-0.5 line-clamp-1 text-xs" dir="rtl">
                    {product.name_ar}
                  </p>
                )}
                <p className="text-aklet-price mt-1 text-sm font-bold tabular-nums" dir="ltr">
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
