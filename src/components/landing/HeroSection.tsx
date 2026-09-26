'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import Link from 'next/link';
import NextImage from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useVisibleGallery } from '@/hooks/useGallery';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getSiteNameAr, getSiteNameEn } from '@/lib/appName';
import { cn, getName } from '@/lib/utils';
import { getHeroImageUrlOrNull } from '@/lib/hero-image';
import { isAlaKeefakTenant } from '@/i18n/config';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const SLIDE_INTERVAL = 6000;

export function HeroSection() {
  const { data: settings } = useRestaurantSettings();
  const { data: gallery } = useVisibleGallery();
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useI18n();
  const t = useTranslations('landing');
  const navT = useTranslations('nav');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const featuredImages = gallery?.filter((item) => item.is_featured && item.image_url) || [];
  const hasCarousel = featuredImages.length > 0;
  const heroImage = getHeroImageUrlOrNull(settings?.hero_image_url);

  const name = getName(locale, getSiteNameEn(settings), getSiteNameAr(settings));
  const tagline = settings?.tagline?.trim() || settings?.hero_subtitle?.trim() || '';
  const orderLabel = isAlaKeefakTenant && locale === 'ar' ? 'اطلب دلوقتي' : navT('orderNow');
  const menuLabel = isAlaKeefakTenant && locale === 'ar' ? 'شوف المنيو' : t('viewMenu');
  const heroAriaLabel = `${t('heroWelcome')} ${name}`;

  const goToSlide = useCallback(
    (index: number) => {
      setDirection(index > currentIndex ? 1 : -1);
      setCurrentIndex(index);
    },
    [currentIndex]
  );

  const goNext = useCallback(() => {
    if (!hasCarousel) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % featuredImages.length);
  }, [hasCarousel, featuredImages.length]);

  const goPrev = useCallback(() => {
    if (!hasCarousel) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + featuredImages.length) % featuredImages.length);
  }, [hasCarousel, featuredImages.length]);

  useEffect(() => {
    if (!hasCarousel || prefersReducedMotion) return;
    const timer = setInterval(goNext, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [hasCarousel, prefersReducedMotion, goNext]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);

  const slideVariants: Variants = {
    enter: { opacity: 0 },
    center: { opacity: 1 },
    exit: { opacity: 0 },
  };

  return (
    <section
      className={cn(
        'relative flex min-h-[100svh] w-full max-w-full overflow-x-clip bg-black',
        isAlaKeefakTenant ? 'items-end md:items-center' : 'items-center justify-center'
      )}
      role="region"
      aria-label={hasCarousel ? t('heroCarousel') : heroAriaLabel}
    >
      {/* Full-bleed visual plane */}
      <div className="absolute inset-0 overflow-hidden">
        {hasCarousel ? (
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial={prefersReducedMotion ? false : 'enter'}
              animate="center"
              exit={prefersReducedMotion ? undefined : 'exit'}
              transition={
                prefersReducedMotion ? { duration: 0 } : { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
              }
              className="absolute inset-0"
            >
              <NextImage
                src={featuredImages[currentIndex].image_url}
                alt={
                  getName(
                    locale,
                    featuredImages[currentIndex].caption_en || '',
                    featuredImages[currentIndex].caption_ar || ''
                  ) || t('slideNumber', { number: currentIndex + 1 })
                }
                fill
                priority={currentIndex === 0}
                sizes="100%"
                className={cn('object-cover', !prefersReducedMotion && 'landing-hero-image')}
              />
            </motion.div>
          </AnimatePresence>
        ) : heroImage ? (
          <NextImage
            src={heroImage}
            alt={name}
            fill
            priority
            sizes="100%"
            className={cn(
              'object-cover object-center',
              !prefersReducedMotion && 'landing-hero-image'
            )}
          />
        ) : null}
        <div
          className={cn(
            'absolute inset-0',
            isAlaKeefakTenant
              ? 'bg-gradient-to-t from-[#080808] via-[#080808]/55 to-[#080808]/20'
              : 'bg-gradient-to-t from-black via-black/60 to-black/45'
          )}
        />
        {isAlaKeefakTenant ? (
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-[#080808]/80 via-[#080808]/35 to-transparent rtl:bg-gradient-to-l"
          />
        ) : null}
      </div>

      <motion.div
        className={cn(
          'relative z-10 flex w-full flex-col px-5 sm:px-8',
          isAlaKeefakTenant
            ? 'max-w-6xl items-start pb-16 pt-28 text-start md:pb-0'
            : 'max-w-3xl items-center px-6 text-center'
        )}
        variants={prefersReducedMotion ? undefined : containerVariants}
        initial={prefersReducedMotion ? false : 'hidden'}
        animate="visible"
      >
        {settings?.logo_url && (
          <motion.div variants={prefersReducedMotion ? undefined : itemVariants} className="mb-5">
            <NextImage
              src={settings.logo_url}
              alt={name}
              width={96}
              height={96}
              priority
              className="h-20 w-20 object-contain drop-shadow-lg md:h-24 md:w-24"
            />
          </motion.div>
        )}

        {isAlaKeefakTenant ? (
          <motion.h1
            className="mb-8 flex max-w-[14ch] flex-col gap-4 leading-[1.15]"
            variants={prefersReducedMotion ? undefined : itemVariants}
            aria-label={tagline || heroAriaLabel}
          >
            {tagline && tagline !== name ? (
              <span className="font-heading text-sm font-medium text-white/80 sm:text-base">
                {name}
              </span>
            ) : null}
            <span className="ember-line w-24" aria-hidden />
            <span className="font-heading text-4xl font-extrabold text-white sm:text-5xl md:text-6xl">
              {tagline || name}
            </span>
          </motion.h1>
        ) : (
          <motion.h1
            className="mb-10 flex max-w-2xl flex-col gap-2 leading-tight drop-shadow-lg"
            variants={prefersReducedMotion ? undefined : itemVariants}
            aria-label={heroAriaLabel}
          >
            <span className="font-heading text-2xl font-medium tracking-wide text-white sm:text-3xl md:text-4xl">
              {t('heroWelcome')}
            </span>
            <span className="font-heading text-brand-accent text-4xl font-bold sm:text-5xl md:text-6xl lg:text-7xl">
              {name}
            </span>
          </motion.h1>
        )}

        <motion.div variants={prefersReducedMotion ? undefined : itemVariants}>
          {isAlaKeefakTenant ? (
            <div className="flex flex-col items-start gap-3">
              <span className="ember-line w-16" aria-hidden />
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/menu"
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'min-h-12 bg-[#FF7A00] px-6 text-base font-semibold text-[#080808] hover:bg-[#E06800]'
                  )}
                >
                  {orderLabel}
                </Link>
                <Link
                  href="/menu"
                  className={cn(
                    buttonVariants({ size: 'lg', variant: 'outline' }),
                    'min-h-12 border-white/25 bg-transparent px-6 text-base font-semibold text-white hover:bg-white/10 hover:text-white'
                  )}
                >
                  {menuLabel}
                </Link>
              </div>
            </div>
          ) : (
            <Link
              href="/welcome"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'bg-brand-accent hover:bg-brand-accent/90 px-10 text-base font-semibold text-black'
              )}
            >
              {t('viewMenu')}
            </Link>
          )}
        </motion.div>
      </motion.div>

      {featuredImages.length > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            className={cn(
              'absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white transition-colors md:left-6',
              isAlaKeefakTenant
                ? 'bg-black/60 hover:bg-black/80'
                : 'bg-black/40 backdrop-blur-sm hover:bg-black/60'
            )}
            aria-label={t('previousSlide')}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className={cn(
              'absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white transition-colors md:right-6',
              isAlaKeefakTenant
                ? 'bg-black/60 hover:bg-black/80'
                : 'bg-black/40 backdrop-blur-sm hover:bg-black/60'
            )}
            aria-label={t('nextSlide')}
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <div
            className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-2 pb-[env(safe-area-inset-bottom)]"
            role="tablist"
            aria-label={t('carouselSlides')}
          >
            {featuredImages.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === currentIndex}
                aria-label={t('goToSlide', { number: i + 1 })}
                onClick={() => goToSlide(i)}
                className={`h-3 min-w-3 rounded-full transition-all duration-300 ${
                  i === currentIndex ? 'bg-brand-accent w-8' : 'w-3 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
