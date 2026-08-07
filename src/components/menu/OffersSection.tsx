'use client';

import { motion } from 'framer-motion';
import { useActiveOffers } from '@/hooks/useOffers';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { Image } from '@/components/shared/Image';
import { MotionSection } from '@/components/shared/motion';
import { Badge } from '@/components/ui/badge';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n } from '@/components/providers/RootI18nProvider';
import { getName } from '@/lib/utils';
import { formatCurrencyAmount, getRestaurantCurrency } from '@/lib/order/format-currency';
import { staggerContainer, staggerItem } from '@/lib/motion';

export function OffersSection() {
  const { data: offers, isLoading } = useActiveOffers();
  const { data: settings } = useRestaurantSettings();
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useI18n();
  const currency = getRestaurantCurrency(settings?.currency);
  const currencyLocale = locale === 'ar' ? 'ar' : 'en';

  if (isLoading || !offers?.length) return null;

  return (
    <MotionSection className="container mx-auto px-4 py-4">
      <div className="from-primary/10 via-primary/5 to-accent/10 rounded-xl bg-gradient-to-r p-4">
        <h2 className="font-heading text-primary mb-3 text-lg font-bold">
          {locale === 'ar' ? 'عروض خاصة' : 'Special Offers'}
        </h2>
        <motion.div
          initial={prefersReducedMotion ? undefined : 'hidden'}
          whileInView="visible"
          viewport={{ once: true }}
          variants={prefersReducedMotion ? undefined : staggerContainer}
          className="scrollbar-none flex gap-3 overflow-x-auto pb-2"
        >
          {offers.map((offer) => (
            <motion.div
              key={offer.id}
              variants={prefersReducedMotion ? undefined : staggerItem}
              className="bg-background min-w-[260px] shrink-0 overflow-hidden rounded-lg border shadow-sm"
            >
              {offer.image_url && (
                <div className="relative aspect-[16/9] w-full overflow-hidden">
                  <Image
                    src={offer.image_url}
                    alt={getName(locale, offer.title_en, offer.title_ar)}
                    fill
                    className="object-cover"
                    sizes="260px"
                  />
                  <Badge className="bg-accent text-foreground absolute left-2 top-2">
                    {offer.discount_type === 'percentage'
                      ? `${offer.discount_value}% OFF`
                      : `${formatCurrencyAmount(offer.discount_value, currency, { locale: currencyLocale })} OFF`}
                  </Badge>
                </div>
              )}
              <div className="p-3">
                <h3 className="font-semibold">{getName(locale, offer.title_en, offer.title_ar)}</h3>
                {(offer.description_en || offer.description_ar) && (
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                    {getName(locale, offer.description_en || '', offer.description_ar)}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </MotionSection>
  );
}
