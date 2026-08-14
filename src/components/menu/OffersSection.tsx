'use client';

import { motion } from 'framer-motion';
import { BadgePercent } from 'lucide-react';
import { useActiveOffers } from '@/hooks/useOffers';
import { useMenuSettings } from '@/components/menu/MenuSettingsProvider';
import { Image } from '@/components/shared/Image';
import { MotionSection } from '@/components/shared/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getName } from '@/lib/utils';
import { formatCurrencyAmount } from '@/lib/order/format-currency';
import { staggerContainer, staggerItem } from '@/lib/motion';

export function OffersSection() {
  const { data: offers, isLoading } = useActiveOffers();
  const { currency } = useMenuSettings();
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useI18n();
  const t = useTranslations('menu');
  const currencyLocale = locale === 'ar' ? 'ar' : 'en';

  if (isLoading || !offers?.length) return null;

  return (
    <MotionSection className="mx-auto max-w-7xl px-3 pt-4 sm:px-4">
      <div className="mb-2.5 flex items-center gap-2">
        <BadgePercent className="h-4.5 w-4.5 text-[var(--hm-accent)]" aria-hidden="true" />
        <h2 className="font-heading text-base font-bold text-[var(--hm-ink)] sm:text-lg">
          {t('offers')}
        </h2>
      </div>

      <motion.div
        initial={prefersReducedMotion ? undefined : 'hidden'}
        whileInView="visible"
        viewport={{ once: true }}
        variants={prefersReducedMotion ? undefined : staggerContainer}
        className="scrollbar-none -mx-3 flex gap-2.5 overflow-x-auto px-3 pb-1 sm:-mx-4 sm:px-4"
      >
        {offers.map((offer) => (
          <motion.article
            key={offer.id}
            variants={prefersReducedMotion ? undefined : staggerItem}
            className="w-[230px] shrink-0 overflow-hidden rounded-[var(--hm-radius)] border border-[var(--hm-line)] bg-[var(--hm-surface)] shadow-[var(--hm-shadow-card)]"
          >
            {offer.image_url && (
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--hm-surface-muted)]">
                <Image
                  src={offer.image_url}
                  alt={getName(locale, offer.title_en, offer.title_ar)}
                  fill
                  className="object-cover"
                  sizes="230px"
                />
                <span className="absolute start-2 top-2 rounded-full bg-[var(--hm-accent)] px-2 py-0.5 text-[11px] font-bold text-[var(--hm-on-accent)]">
                  {offer.discount_type === 'percentage'
                    ? `${offer.discount_value}%`
                    : formatCurrencyAmount(offer.discount_value, currency, {
                        locale: currencyLocale,
                      })}
                </span>
              </div>
            )}
            <div className="p-2.5">
              <h3 className="line-clamp-1 text-sm font-semibold text-[var(--hm-ink)]">
                {getName(locale, offer.title_en, offer.title_ar)}
              </h3>
              {(offer.description_en || offer.description_ar) && (
                <p className="mt-0.5 line-clamp-2 text-xs text-[var(--hm-ink-soft)]">
                  {getName(locale, offer.description_en || '', offer.description_ar)}
                </p>
              )}
            </div>
          </motion.article>
        ))}
      </motion.div>
    </MotionSection>
  );
}
