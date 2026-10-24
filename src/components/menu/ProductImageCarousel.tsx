'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Image } from '@/components/shared/Image';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { productTerm } from '@/lib/i18n/product-terminology';
import { cn } from '@/lib/utils';

export const LANDING_CARD_IMAGE_SIZES = '(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw';

const SWIPE_THRESHOLD_PX = 8;

interface ProductImageCarouselProps {
  slides: string[];
  alt: string;
  sizes: string;
  /** Priority on the first slide only. Landing passes this for the first two cards. */
  priority?: boolean;
  className?: string;
  imageClassName?: string;
}

function scheduleIdle(callback: () => void): number {
  if (typeof window.requestIdleCallback === 'function') {
    return window.requestIdleCallback(callback);
  }
  return window.setTimeout(callback, 200);
}

function cancelIdle(id: number) {
  if (typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(id);
    return;
  }
  window.clearTimeout(id);
}

export function ProductImageCarousel({
  slides,
  alt,
  sizes,
  priority = false,
  className,
  imageClassName,
}: ProductImageCarouselProps) {
  const { dir } = useI18n();
  const prefersReducedMotion = useReducedMotion();
  const tRaw = useTranslations('products');
  const t = (key: string, values?: Record<string, string | number | Date>) =>
    productTerm(tRaw, key, values);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const loadedRef = useRef(new Set<number>());
  const [active, setActive] = useState(0);
  const [unlocked, setUnlocked] = useState<number[]>([0]);
  const activeRef = useRef(0);

  const slideCount = slides.length;
  const hasChrome = slideCount > 1;

  const setActiveIndex = (index: number) => {
    const nextIndex = Math.min(Math.max(index, 0), Math.max(slideCount - 1, 0));
    activeRef.current = nextIndex;
    setActive((prev) => (prev === nextIndex ? prev : nextIndex));
    setUnlocked((prev) => (prev.includes(nextIndex) ? prev : [...prev, nextIndex]));
  };

  useEffect(() => {
    if (!loadedRef.current.has(active)) return;
    const next = active + 1;
    if (next >= slideCount) return;
    const id = scheduleIdle(() => {
      setUnlocked((prev) => (prev.includes(next) ? prev : [...prev, next]));
    });
    return () => cancelIdle(id);
  }, [active, slideCount]);

  const settleSlide = (index: number) => {
    loadedRef.current.add(index);
    if (index !== activeRef.current) return;
    const next = index + 1;
    if (next >= slideCount) return;
    scheduleIdle(() => {
      setUnlocked((prev) => (prev.includes(next) ? prev : [...prev, next]));
    });
  };

  const scrollToIndex = (index: number) => {
    const scroller = scrollerRef.current;
    const slide = scroller?.children[index] as HTMLElement | undefined;
    if (!scroller || !slide) return;
    setActiveIndex(index);
    const delta = slide.getBoundingClientRect().left - scroller.getBoundingClientRect().left;
    scroller.scrollBy({ left: delta, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };

  const onScroll = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const mid = scroller.getBoundingClientRect().left + scroller.clientWidth / 2;
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let index = 0; index < scroller.children.length; index += 1) {
      const rect = (scroller.children[index] as HTMLElement).getBoundingClientRect();
      const dist = Math.abs(rect.left + rect.width / 2 - mid);
      if (dist < bestDist) {
        best = index;
        bestDist = dist;
      }
    }
    setActiveIndex(best);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!hasChrome) return;
    const forwardKey = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const backKey = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    if (event.key !== forwardKey && event.key !== backKey) return;
    event.preventDefault();
    const delta = event.key === forwardKey ? 1 : -1;
    scrollToIndex(Math.min(slideCount - 1, Math.max(0, active + delta)));
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!hasChrome || event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      dragRef.current = null;
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (
      Math.abs(event.clientX - drag.x) > SWIPE_THRESHOLD_PX ||
      Math.abs(event.clientY - drag.y) > SWIPE_THRESHOLD_PX
    ) {
      drag.moved = true;
    }
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.moved) suppressClickRef.current = true;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  if (slideCount === 0) return null;

  return (
    <div
      className={cn('relative h-full w-full', className)}
      dir={dir}
      role={hasChrome ? 'region' : undefined}
      aria-roledescription={hasChrome ? 'carousel' : undefined}
      aria-label={hasChrome ? t('productImagesLabel') : undefined}
      tabIndex={hasChrome ? 0 : undefined}
      onKeyDown={onKeyDown}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return;
        suppressClickRef.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="scrollbar-none flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth motion-reduce:scroll-auto"
      >
        {slides.map((url, index) => {
          const inWindow = Math.abs(index - active) <= 1;
          const showImage = inWindow && unlocked.includes(index);
          return (
            <div
              key={`${url}-${index}`}
              className="relative h-full w-full shrink-0 basis-full snap-start"
            >
              {showImage ? (
                <Image
                  src={url}
                  alt={
                    index === 0
                      ? alt
                      : t('imagePosition', { current: index + 1, total: slideCount })
                  }
                  fill
                  sizes={sizes}
                  priority={priority && index === 0}
                  className={cn('object-cover', imageClassName)}
                  containerClassName="absolute inset-0 h-full w-full"
                  onLoad={() => settleSlide(index)}
                  onError={() => settleSlide(index)}
                />
              ) : (
                <div className="bg-muted absolute inset-0" />
              )}
            </div>
          );
        })}
      </div>

      {hasChrome ? (
        <>
          <button
            type="button"
            className="bg-background/80 text-foreground absolute start-2 top-1/2 z-10 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full shadow-sm sm:flex"
            aria-label={t('previousImage')}
            disabled={active === 0}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              scrollToIndex(Math.max(0, active - 1));
            }}
          >
            <ChevronLeft className="size-4 rtl:rotate-180" />
          </button>
          <button
            type="button"
            className="bg-background/80 text-foreground absolute end-2 top-1/2 z-10 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full shadow-sm sm:flex"
            aria-label={t('nextImage')}
            disabled={active === slideCount - 1}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              scrollToIndex(Math.min(slideCount - 1, active + 1));
            }}
          >
            <ChevronRight className="size-4 rtl:rotate-180" />
          </button>
          <div className="absolute inset-x-0 bottom-2 z-10 flex items-center justify-center gap-1.5">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={t('imagePosition', { current: index + 1, total: slideCount })}
                aria-current={index === active ? 'true' : undefined}
                className={cn(
                  'size-1.5 rounded-full',
                  index === active ? 'bg-white' : 'bg-white/50'
                )}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  scrollToIndex(index);
                }}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
