'use client';

import { Image } from '@/components/shared/Image';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getHeroImageUrl } from '@/lib/hero-image';
import { getName } from '@/lib/utils';

/**
 * The single signature moment of the menu: a compact cinematic reveal that
 * hands the page over to the food photography and then gets out of the way.
 * One ken-burns pass via CSS so reduced-motion users get a still frame.
 */
export function AkletHero() {
  const { data: settings } = useRestaurantSettings();
  const { locale } = useI18n();
  const t = useTranslations('menu');
  const tCommon = useTranslations('common');

  const name = getName(
    locale,
    settings?.name_en || tCommon('appName'),
    settings?.name_ar || tCommon('appName')
  );

  const image = getHeroImageUrl(
    settings?.hero_image_url || settings?.story_image_url || settings?.logo_url
  );

  const line =
    settings?.hero_subtitle?.trim() ||
    settings?.hero_headline?.trim() ||
    settings?.tagline?.trim() ||
    t('heroFallbackLine');

  return (
    <section
      className="relative isolate h-[30svh] min-h-[220px] w-full overflow-hidden sm:h-[34svh] sm:max-h-[380px]"
      aria-label={name}
    >
      <div className="absolute inset-0">
        <Image
          src={image}
          alt=""
          fill
          priority
          sizes="100vw"
          className="aklet-ken-burns object-cover"
          containerClassName="absolute inset-0 h-full w-full"
          showFallback={false}
        />
      </div>

      <div
        aria-hidden
        className="from-aklet-grill via-aklet-grill/55 absolute inset-0 bg-gradient-to-t to-transparent"
      />
      <div
        aria-hidden
        className="from-aklet-grill/70 absolute inset-0 bg-gradient-to-b via-transparent to-transparent"
      />

      <div className="relative flex h-full flex-col justify-end px-4 pb-5 sm:px-6 sm:pb-7">
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-aklet-coral text-[11px] font-semibold uppercase ltr:tracking-[0.18em]">
            {t('heroKicker')}
          </p>
          <h1 className="font-heading mt-1.5 text-2xl font-bold leading-tight text-white drop-shadow-sm sm:text-4xl">
            {name}
          </h1>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-white/80 sm:text-base">
            {line}
          </p>
          <span
            aria-hidden
            className="bg-aklet-coral mt-3 block h-[3px] w-10 rounded-full sm:mt-4"
          />
        </div>
      </div>
    </section>
  );
}
