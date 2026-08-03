'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star } from 'lucide-react';
import { MotionSection } from '@/components/shared/motion';
import { useFeaturedTestimonials } from '@/hooks/useTestimonials';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'h-4 w-4',
            star <= rating ? 'fill-brand-accent text-brand-accent' : 'text-muted'
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

export function TestimonialsSection() {
  const { data: testimonials } = useFeaturedTestimonials();
  const prefersReducedMotion = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

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
    <section className="bg-muted/30 py-20 md:py-28">
      <div className="container mx-auto px-4">
        <MotionSection>
          <div className="mb-12 text-center">
            <h2 className="font-heading text-4xl font-bold text-primary md:text-5xl">
              What Our Guests Say
            </h2>
            <div className="mx-auto mt-4 h-1 w-20 rounded bg-brand-accent" />
          </div>
        </MotionSection>

        <div
          className="relative mx-auto max-w-4xl"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {items.map((testimonial) => (
                <div key={testimonial.id} className="w-full flex-shrink-0 px-4">
                  <div className="rounded-xl bg-card p-6 text-center ring-1 ring-foreground/10 md:p-8">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-xl font-bold text-primary font-heading">
                        {getInitials(testimonial.customer_name)}
                      </span>
                    </div>
                    <StarRating rating={testimonial.rating} />
                    <p className="mx-auto mt-4 max-w-lg text-muted-foreground" dir={testimonial.review_en ? 'ltr' : 'rtl'}>
                      &ldquo;{testimonial.review_en || testimonial.review_ar}&rdquo;
                    </p>
                    <p className="mt-4 font-heading text-sm font-semibold">
                      {testimonial.customer_name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {items.length > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              {items.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    'h-2 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2',
                    index === currentIndex
                      ? 'w-6 bg-primary'
                      : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  )}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
