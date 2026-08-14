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
    <MotionSection className="mx-auto max-w-6xl px-3 py-4 sm:px-5">
      <div className="border-aklet-line/70 bg-aklet-sand/40 rounded-2xl border p-4">
        <span aria-hidden className="bg-aklet-coral mb-2 block h-[3px] w-8 rounded-full" />
        <h2 className="font-heading text-aklet-ink mb-3 text-base font-bold sm:text-lg">
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
              className="border-aklet-line/70 bg-aklet-paper-soft min-w-[260px] shrink-0 overflow-hidden rounded-xl border"
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
                  <Badge className="bg-aklet-coral-cta absolute start-2 top-2 text-white">
                    {offer.discount_type === 'percentage'
                      ? `${offer.discount_value}% OFF`
                      : `${formatCurrencyAmount(offer.discount_value, currency, { locale: currencyLocale })} OFF`}
                  </Badge>
                </div>
              )}
              <div className="p-3">
                <h3 className="font-heading text-aklet-ink font-bold">
                  {getName(locale, offer.title_en, offer.title_ar)}
                </h3>
                {(offer.description_en || offer.description_ar) && (
                  <p className="text-aklet-ink-soft mt-1 line-clamp-2 text-sm">
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
