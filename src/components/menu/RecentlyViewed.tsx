'use client';

import { Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/shared/Image';
import { MotionSection } from '@/components/shared/motion';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { motion } from 'framer-motion';
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
    <MotionSection className="container mx-auto px-4 py-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="text-muted-foreground h-4 w-4" />
          <h2 className="font-heading text-lg font-bold">{t('recentlyViewed')}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={clearRecent} className="text-muted-foreground">
          <X className="mr-1 h-3 w-3" />
          {t('clear')}
        </Button>
      </div>
      <motion.div
        initial={prefersReducedMotion ? undefined : 'hidden'}
        whileInView="visible"
        viewport={{ once: true }}
        variants={prefersReducedMotion ? undefined : staggerContainer}
        className="scrollbar-none flex gap-3 overflow-x-auto pb-2"
      >
        {recent.map((product) => {
          const name = getName(locale, product.name_en, product.name_ar);
          return (
            <motion.button
              key={product.id}
              variants={prefersReducedMotion ? undefined : staggerItem}
              onClick={() => onSelectProduct(product.id)}
              className="flex min-w-[140px] shrink-0 overflow-hidden rounded-lg border text-left transition-shadow hover:shadow-md"
            >
              {product.image_url && (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden">
                  <Image
                    src={product.image_url}
                    alt={name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              )}
              <div className="flex flex-col justify-center p-2">
                <h4 className="line-clamp-1 text-sm font-medium">{name}</h4>
                <p className="text-primary text-xs">
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
