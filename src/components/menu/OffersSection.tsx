'use client';

import { motion } from 'framer-motion';
import { useActiveOffers } from '@/hooks/useOffers';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { Image } from '@/components/shared/Image';
import { MotionSection } from '@/components/shared/motion';
import { Badge } from '@/components/ui/badge';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { cn, getName } from '@/lib/utils';
import {
  formatCurrencyAmount,
  getRestaurantCurrency,
  toCurrencyLocale,
} from '@/lib/order/format-currency';
import { staggerContainer, staggerItem } from '@/lib/motion';

interface OffersSectionProps {
  /** Compact chip strip when a category is selected */
  compact?: boolean;
}

export function OffersSection({ compact = false }: OffersSectionProps) {
  const { data: offers, isLoading } = useActiveOffers();
  const { data: settings } = useRestaurantSettings();
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useI18n();
  const t = useTranslations('menu');
  const currency = getRestaurantCurrency(settings?.currency);
  const currencyLocale = toCurrencyLocale(locale);

  if (isLoading || !offers?.length) return null;

  if (compact) {
    return (
      <section className="border-b border-[var(--menu-line)] bg-[var(--menu-surface)]">
        <div className="mx-auto max-w-6xl px-3 py-2.5 sm:px-5">
          <div className="mb-1.5 flex items-center gap-2">
            <p className="menu-eyebrow shrink-0 text-[var(--menu-ink-soft)]">{t('offers')}</p>
            <span aria-hidden className="menu-rule h-px flex-1" />
            <p className="text-[10px] leading-tight text-[var(--menu-ink-soft)] sm:text-xs">
              {t('displayPromoHelper')}
            </p>
          </div>
          <div className="scrollbar-none flex gap-2 overflow-x-auto pb-0.5">
            {offers.map((offer) => {
              const title = getName(locale, offer.title_en, offer.title_ar);
              const discountLabel =
                offer.discount_type === 'percentage'
                  ? `${offer.discount_value}%`
                  : formatCurrencyAmount(offer.discount_value, currency, {
                      locale: currencyLocale,
                    });
              return (
                <div
                  key={offer.id}
                  className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[var(--menu-line-strong)] bg-[var(--menu-paper)] px-3 py-1.5"
                >
                  <span className="font-heading text-xs font-semibold text-[var(--menu-wine)]">
                    {discountLabel}
                  </span>
                  <span className="max-w-[10rem] truncate text-xs text-[var(--menu-ink)]">
                    {title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return (
    <MotionSection className="mx-auto max-w-6xl px-3 py-5 sm:px-5">
      <div className="rounded-xl border border-[var(--menu-line)] bg-[var(--menu-surface)] p-4">
        <div className="mb-1 flex items-center gap-3">
          <h2 className="font-heading text-base font-semibold text-[var(--menu-ink)] sm:text-lg">
            {t('offers')}
          </h2>
          <span aria-hidden className="menu-rule h-px flex-1" />
        </div>
        <p className="mb-3 text-xs text-[var(--menu-ink-soft)]">{t('displayPromoHelper')}</p>
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
                  <Badge
                    className={cn(
                      'absolute start-2 top-2 text-[10px] uppercase tracking-[0.08em]',
                      'bg-[#FDF7F0]/94 text-[var(--menu-wine)]'
                    )}
                  >
                    {offer.discount_type === 'percentage'
                      ? `${offer.discount_value}% OFF`
                      : `${formatCurrencyAmount(offer.discount_value, currency, { locale: currencyLocale })} OFF`}
                  </Badge>
                </div>
              )}
              <div className="p-3">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--menu-ink-soft)]">
                  {t('displayPromoBadge')}
                </p>
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
