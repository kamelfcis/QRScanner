'use client';

import NextImage from 'next/image';
import { motion } from 'framer-motion';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getSiteNameAr, getSiteNameEn } from '@/lib/appName';
import { getName } from '@/lib/utils';

/**
 * The one signature moment: a compact cinematic band under the header.
 * Image does a single slow ken-burns pass, then rests.
 */
export function MenuHero() {
  const { data: settings } = useRestaurantSettings();
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useI18n();
  const t = useTranslations('menu');
  const name = getName(locale, getSiteNameEn(settings), getSiteNameAr(settings));

  const headline = settings?.hero_headline?.trim() || name;
  const tagline = settings?.hero_subtitle?.trim() || t('heroTagline');
  const image = settings?.hero_image_url?.trim();

  return (
    <section
      aria-label={headline}
      className="relative isolate w-full overflow-hidden bg-[var(--menu-paper-deep)]"
    >
      <div className="relative h-[clamp(180px,30vh,268px)] w-full md:h-[clamp(196px,26vh,256px)]">
        {image ? (
          <div className="menu-hero-image absolute inset-0">
            <NextImage
              src={image}
              alt={t('heroImageAlt', { name })}
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
          </div>
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,#3a2a1c_0%,#241a12_55%,#160f0a_100%)]"
          />
        )}

        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/10"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--menu-gold-line-strong)] to-transparent"
        />

        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-x-0 bottom-0 mx-auto flex max-w-6xl flex-col items-start px-4 pb-5 text-start sm:px-6 sm:pb-6"
        >
          <span className="menu-eyebrow mb-2 inline-flex items-center gap-2 text-[#E8D6AE]">
            <span aria-hidden className="h-px w-6 bg-[#E8D6AE]/70" />
            {t('menuLead')}
          </span>
          <h2 className="font-heading max-w-[22ch] text-2xl font-semibold leading-tight text-white drop-shadow-sm sm:text-3xl">
            {headline}
          </h2>
          <p className="mt-1.5 max-w-[36ch] text-[13px] leading-relaxed text-white/80 sm:text-sm">
            {tagline}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
