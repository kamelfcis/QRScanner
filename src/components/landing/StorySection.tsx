'use client';

import NextImage from 'next/image';
import { MotionSection } from '@/components/shared/motion';
import { ParallaxSection } from '@/components/shared/motion';
import { fadeInLeft, fadeInRight } from '@/lib/motion';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getName } from '@/lib/utils';

export function StorySection() {
  const { data: settings } = useRestaurantSettings();
  const { locale } = useI18n();
  const t = useTranslations('landing');
  const tSettings = useTranslations('settings');

  const restaurantName = getName(
    locale,
    settings?.name_en || t('heroTitle'),
    settings?.name_ar || t('heroTitle')
  );
  const logoInitial = (settings?.name_en || settings?.name_ar || 'W').charAt(0).toUpperCase();

  return (
    <section id="story" className="section-stripe relative py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <MotionSection variants={fadeInLeft}>
            <div className="space-y-6">
              <h2 className="font-heading text-primary text-4xl font-bold md:text-5xl">
                {t('storyTitle')}
              </h2>
              <div className="bg-brand-accent h-1 w-20 rounded" />
              <p className="text-muted-foreground text-lg leading-relaxed">{t('storyP1')}</p>
              <p className="text-muted-foreground text-lg leading-relaxed">{t('storyP2')}</p>
            </div>
          </MotionSection>

          <MotionSection variants={fadeInRight} delay={0.2}>
            <ParallaxSection speed={0.2}>
              <div className="from-brand-primary/20 to-brand-secondary/20 relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br">
                {settings?.story_image_url ? (
                  <NextImage
                    src={settings.story_image_url}
                    alt={tSettings('storyImageAlt')}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="bg-brand-primary/10 mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full">
                        <span className="text-brand-primary font-heading text-5xl font-bold">
                          {logoInitial}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-sm">{restaurantName}</p>
                    </div>
                  </div>
                )}
              </div>
            </ParallaxSection>
          </MotionSection>
        </div>
      </div>
    </section>
  );
}
