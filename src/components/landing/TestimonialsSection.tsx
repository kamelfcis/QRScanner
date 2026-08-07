'use client';

import { useState, useEffect, useCallback } from 'react';
import { Quote, Star } from 'lucide-react';
import { MotionSection } from '@/components/shared/motion';
import { useFeaturedTestimonials } from '@/hooks/useTestimonials';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { cn } from '@/lib/utils';
import type { Testimonial } from '@/types';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex justify-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'h-5 w-5 drop-shadow-sm',
            star <= rating ? 'fill-brand-accent text-brand-accent' : 'text-muted-foreground/25'
          )}
        />
      ))}
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getReviewText(testimonial: Testimonial, locale: string) {
  if (locale === 'ar') return testimonial.review_ar || testimonial.review_en || '';
  return testimonial.review_en || testimonial.review_ar || '';
}

export function TestimonialsSection() {
  const { data: testimonials } = useFeaturedTestimonials();
  const prefersReducedMotion = useReducedMotion();
  const { locale, dir } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const t = useTranslations('landing');

  const items = testimonials || [];

  const advance = useCallback(() => {
    if (items.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (prefersReducedMotion || isPaused || items.length <= 1) return;
    const interval = setInterval(advance, 5000);
    return () => clearInterval(interval);
  }, [advance, prefersReducedMotion, isPaused, items.length]);

  if (items.length === 0) return null;

  return (
    <section className="bg-muted/30 relative overflow-hidden py-20 md:py-28">
      <div
        className="via-brand-accent/[0.03] pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-transparent"
        aria-hidden
      />
      <div className="container relative mx-auto px-4">
        <MotionSection>
          <div className="mb-12 text-center">
            <p className="font-heading text-brand-accent mb-3 text-sm font-medium uppercase tracking-[0.22em]">
              {t('testimonialsLabel')}
            </p>
            <h2 className="font-heading text-primary text-4xl font-bold md:text-5xl">
              {t('whatOurGuestsSay')}
            </h2>
            <div className="bg-brand-accent mx-auto mt-4 h-1 w-20 rounded" />
          </div>
        </MotionSection>

        <div
          className="relative mx-auto max-w-3xl"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{
                transform:
                  dir === 'rtl'
                    ? `translateX(${currentIndex * 100}%)`
                    : `translateX(-${currentIndex * 100}%)`,
              }}
            >
              {items.map((testimonial) => {
                const review = getReviewText(testimonial, locale);
                const isRtl = dir === 'rtl' || (locale === 'ar' && !!testimonial.review_ar);

                return (
                  <div key={testimonial.id} className="w-full flex-shrink-0 px-4">
                    <div
                      className={cn(
                        'border-brand-accent/15 relative overflow-hidden rounded-2xl border',
                        'bg-card/90 p-8 text-center shadow-lg backdrop-blur-xl md:p-10'
                      )}
                    >
                      <div
                        className="via-brand-accent/50 pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
                        aria-hidden
                      />
                      <Quote className="text-brand-accent/40 mx-auto mb-4 h-8 w-8" aria-hidden />
                      <div className="bg-brand-accent/10 ring-brand-accent/25 mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ring-1">
                        <span className="font-heading text-brand-accent text-xl font-bold">
                          {getInitials(testimonial.customer_name)}
                        </span>
                      </div>
                      <StarRating rating={testimonial.rating} />
                      <p
                        className="text-muted-foreground mx-auto mt-5 max-w-lg text-base leading-relaxed md:text-lg"
                        dir={isRtl ? 'rtl' : 'ltr'}
                      >
                        &ldquo;{review}&rdquo;
                      </p>
                      <p className="font-heading text-primary mt-6 text-sm font-semibold tracking-wide">
                        {testimonial.customer_name}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {items.length > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {items.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    'focus-visible:outline-brand-accent h-2 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2',
                    index === currentIndex
                      ? 'bg-brand-accent w-8'
                      : 'bg-muted-foreground/30 hover:bg-brand-accent/50 w-2'
                  )}
                  aria-label={t('goToTestimonial', { number: index + 1 })}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
