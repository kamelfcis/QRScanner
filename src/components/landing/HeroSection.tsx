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
import { getHeroImageUrl } from '@/lib/hero-image';
import { cn, getName } from '@/lib/utils';

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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const featuredImages = gallery?.filter((item) => item.is_featured && item.image_url) || [];
  const hasCarousel = featuredImages.length > 0;
  const heroImage = getHeroImageUrl(settings?.hero_image_url);

  const name = getName(
    locale,
    settings?.name_en || t('heroTitle'),
    settings?.name_ar || t('heroTitle')
  );
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
      className="relative flex min-h-[100svh] w-full max-w-full items-center justify-center overflow-x-clip bg-black"
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
                className="object-cover"
              />
            </motion.div>
          </AnimatePresence>
        ) : (
          <NextImage
            src={heroImage}
            alt={name}
            fill
            priority
            sizes="100%"
            className="object-cover object-center"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/45" />
      </div>

      <motion.div
        className="relative z-10 flex w-full max-w-3xl flex-col items-center px-6 text-center"
        variants={prefersReducedMotion ? undefined : containerVariants}
        initial={prefersReducedMotion ? false : 'hidden'}
        animate="visible"
      >
        {settings?.logo_url && (
          <motion.div variants={prefersReducedMotion ? undefined : itemVariants} className="mb-5">
            <NextImage
              src={settings.logo_url}
              alt={name}
              width={144}
              height={144}
              priority
              className="h-28 w-28 object-contain drop-shadow-lg md:h-36 md:w-36"
            />
          </motion.div>
        )}

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

        <motion.div variants={prefersReducedMotion ? undefined : itemVariants}>
          <Link
            href="/welcome"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'bg-brand-accent hover:bg-brand-accent/90 text-on-accent px-10 text-base font-semibold'
            )}
          >
            {t('viewMenu')}
          </Link>
        </motion.div>
      </motion.div>

      {featuredImages.length > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 md:left-6"
            aria-label={t('previousSlide')}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 md:right-6"
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
