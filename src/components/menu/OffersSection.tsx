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
import {
  formatCurrencyAmount,
  getRestaurantCurrency,
  toCurrencyLocale,
} from '@/lib/order/format-currency';
import { staggerContainer, staggerItem } from '@/lib/motion';

export function OffersSection() {
  const { data: offers, isLoading } = useActiveOffers();
  const { data: settings } = useRestaurantSettings();
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useI18n();
  const currency = getRestaurantCurrency(settings?.currency);
  const currencyLocale = toCurrencyLocale(locale);

  if (isLoading || !offers?.length) return null;

  return (
    <MotionSection className="mx-auto max-w-6xl px-3 py-5 sm:px-5">
      <div className="rounded-xl border border-[var(--menu-line)] bg-[var(--menu-surface)] p-4">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="font-heading text-base font-semibold text-[var(--menu-ink)] sm:text-lg">
            {locale === 'ar' ? 'عروض خاصة' : 'Special Offers'}
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
          {offers.map((offer) => (
            <motion.div
              key={offer.id}
              variants={prefersReducedMotion ? undefined : staggerItem}
              className="min-w-[240px] shrink-0 overflow-hidden rounded-lg border border-[var(--menu-line)] bg-[var(--menu-paper)]"
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
                  <Badge className="bg-[#FDF7F0]/94 absolute start-2 top-2 text-[10px] uppercase tracking-[0.08em] text-[var(--menu-wine)]">
                    {offer.discount_type === 'percentage'
                      ? `${offer.discount_value}% OFF`
                      : `${formatCurrencyAmount(offer.discount_value, currency, { locale: currencyLocale })} OFF`}
                  </Badge>
                </div>
              )}
              <div className="p-3">
                <h3 className="font-heading text-sm font-semibold text-[var(--menu-ink)]">
                  {getName(locale, offer.title_en, offer.title_ar)}
                </h3>
                {(offer.description_en || offer.description_ar) && (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--menu-ink-soft)]">
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
