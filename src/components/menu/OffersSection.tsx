'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useActiveOffers } from '@/hooks/useOffers';
import { useFeatureSettings, useRestaurantSettings } from '@/hooks/useSettings';
import { Image } from '@/components/shared/Image';
import { MotionSection } from '@/components/shared/motion';
import { Badge } from '@/components/ui/badge';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { useCartStore } from '@/stores/cart-store';
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

function CouponCheckoutHint({ className }: { className?: string }) {
  const t = useTranslations('menu');
  const { data: features } = useFeatureSettings();
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const couponsEnabled = features?.coupons === true;

  if (!couponsEnabled) return null;

  const label = t('haveCodeAtCheckout');

  if (cartCount > 0) {
    return (
      <Link
        href="/checkout"
        className={cn(
          'inline-flex min-h-11 max-w-full touch-manipulation items-center text-[10px] leading-tight text-[var(--menu-wine)] underline-offset-4 hover:underline sm:text-xs',
          className
        )}
      >
        {label}
      </Link>
    );
  }

  return (
    <p
      className={cn('text-[10px] leading-tight text-[var(--menu-ink-soft)] sm:text-xs', className)}
    >
      {label}
    </p>
  );
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
          <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="menu-eyebrow shrink-0 text-[var(--menu-ink-soft)]">{t('offers')}</p>
            <span aria-hidden className="menu-rule hidden h-px flex-1 sm:block" />
            <p className="text-[10px] leading-tight text-[var(--menu-ink-soft)] sm:text-xs">
              {t('displayPromoHelper')}
            </p>
            <CouponCheckoutHint className="ms-auto" />
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
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-xs text-[var(--menu-ink-soft)]">{t('displayPromoHelper')}</p>
          <CouponCheckoutHint />
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
