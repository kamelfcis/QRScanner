'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import Link from 'next/link';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useVisibleGallery } from '@/hooks/useGallery';
import { useTranslations } from '@/components/providers/RootI18nProvider';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.3 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

const SLIDE_INTERVAL = 5000;

export function HeroSection() {
  const { data: settings } = useRestaurantSettings();
  const { data: gallery } = useVisibleGallery();
  const prefersReducedMotion = useReducedMotion();
  const t = useTranslations('landing');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const featuredImages =
    gallery?.filter((item) => item.is_featured && item.image_url) || [];
  const hasCarousel = featuredImages.length > 0;

  const name = settings?.name_en || t('heroTitle');
  const headline = settings?.hero_headline || name;
  const subtitle =
    settings?.hero_subtitle ||
    settings?.tagline ||
    t('heroSubtitle');

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
    setCurrentIndex(
      (prev) => (prev - 1 + featuredImages.length) % featuredImages.length
    );
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
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  if (!hasCarousel) {
    return (
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary via-brand-secondary-dark to-brand-secondary" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,215,0,0.15)_0%,_transparent_60%)]" />

        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-brand-accent/10"
            style={{
              width: 80 + i * 40,
              height: 80 + i * 40,
              left: `${10 + i * 18}%`,
              top: `${15 + (i % 3) * 25}%`,
            }}
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    y: [0, -20, 0],
                    transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' as const },
                  }
            }
          />
        ))}

        <motion.div
          className="relative z-10 flex flex-col items-center px-4 text-center"
          variants={prefersReducedMotion ? undefined : containerVariants}
          initial={prefersReducedMotion ? undefined : 'hidden'}
          animate="visible"
        >
          <motion.div variants={prefersReducedMotion ? undefined : itemVariants}>
            <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full border-2 border-brand-accent/30 bg-white/10 backdrop-blur-sm md:h-40 md:w-40">
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt={name}
                  className="h-24 w-24 object-contain md:h-32 md:w-32"
                />
              ) : (
                <span className="text-4xl font-bold text-brand-accent font-heading md:text-5xl">
                  {name.charAt(0)}
                </span>
              )}
            </div>
          </motion.div>

          <motion.h1
            className="mb-4 font-heading text-5xl font-bold text-white md:text-7xl"
            variants={prefersReducedMotion ? undefined : itemVariants}
          >
            {headline}
          </motion.h1>

          <motion.p
            className="mb-8 max-w-xl text-xl text-brand-accent md:text-2xl"
            variants={prefersReducedMotion ? undefined : itemVariants}
          >
            {subtitle}
          </motion.p>

          <motion.div
            className="flex flex-col gap-4 sm:flex-row"
            variants={prefersReducedMotion ? undefined : itemVariants}
          >
            <Button
              render={<Link href="/menu" />}
              size="lg"
              className="bg-brand-accent text-black hover:bg-brand-accent/90 px-8"
            >
              {t('viewMenu')}
            </Button>
            <Button
              render={<Link href="#story" />}
              size="lg"
              variant="outline"
              className="border-brand-accent/50 text-brand-accent hover:bg-brand-accent/10 px-8"
            >
              {t('ourStory')}
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={prefersReducedMotion ? undefined : { y: [0, 10, 0] }}
          transition={prefersReducedMotion ? undefined : { duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="h-8 w-8 text-brand-accent/60" />
        </motion.div>
      </section>
    );
  }

  return (
    <section
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      role="region"
      aria-label={t('heroCarousel')}
    >
      <div className="absolute inset-0">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
            }
            className="absolute inset-0"
          >
            <img
              src={featuredImages[currentIndex].image_url}
              alt={
                featuredImages[currentIndex].caption_en ||
                featuredImages[currentIndex].caption_ar ||
                t('slideNumber', { number: currentIndex + 1 })
              }
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
      </div>

      <motion.div
        className="relative z-10 flex flex-col items-center px-4 text-center"
        variants={prefersReducedMotion ? undefined : containerVariants}
        initial={prefersReducedMotion ? undefined : 'hidden'}
        animate="visible"
      >
        <motion.div variants={prefersReducedMotion ? undefined : itemVariants}>
          <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full border-2 border-brand-accent/30 bg-white/10 backdrop-blur-sm md:h-40 md:w-40">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt={name}
                className="h-24 w-24 object-contain md:h-32 md:w-32"
              />
            ) : (
              <span className="text-4xl font-bold text-brand-accent font-heading md:text-5xl">
                {name.charAt(0)}
              </span>
            )}
          </div>
        </motion.div>

        <motion.h1
          className="mb-4 font-heading text-5xl font-bold text-white drop-shadow-lg md:text-7xl"
          variants={prefersReducedMotion ? undefined : itemVariants}
        >
          {headline}
        </motion.h1>

        <motion.p
          className="mb-8 max-w-xl text-xl text-brand-accent drop-shadow-md md:text-2xl"
          variants={prefersReducedMotion ? undefined : itemVariants}
        >
          {subtitle}
        </motion.p>

        <motion.div
          className="flex flex-col gap-4 sm:flex-row"
          variants={prefersReducedMotion ? undefined : itemVariants}
        >
          <Button
            render={<Link href="/menu" />}
            size="lg"
            className="bg-brand-accent text-black hover:bg-brand-accent/90 px-8"
          >
            {t('viewMenu')}
          </Button>
          <Button
            render={<Link href="#story" />}
            size="lg"
            variant="outline"
            className="border-brand-accent/50 text-brand-accent hover:bg-brand-accent/10 px-8"
          >
            {t('ourStory')}
          </Button>
        </motion.div>
      </motion.div>

      {featuredImages.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-4 z-20 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/60 md:left-6"
            aria-label={t('previousSlide')}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-4 z-20 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/60 md:right-6"
            aria-label={t('nextSlide')}
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <div
            className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-2"
            role="tablist"
            aria-label={t('carouselSlides')}
          >
            {featuredImages.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === currentIndex}
                aria-label={t('goToSlide', { number: i + 1 })}
                onClick={() => goToSlide(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentIndex ? 'w-8 bg-brand-accent' : 'w-2 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}

      <motion.div
        className="absolute bottom-20 left-1/2 -translate-x-1/2 md:bottom-24"
        animate={prefersReducedMotion ? undefined : { y: [0, 10, 0] }}
        transition={prefersReducedMotion ? undefined : { duration: 2, repeat: Infinity }}
      >
        <ChevronDown className="h-8 w-8 text-brand-accent/60" />
      </motion.div>
    </section>
  );
}
