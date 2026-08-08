'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getInlineScrollDirection, getScrollMetrics } from '@/lib/scroll/inline-scroll';
import { cn } from '@/lib/utils';

export interface ScrollableChipRowProps {
  children: ReactNode;
  ariaLabel: string;
  scrollPrevLabel: string;
  scrollNextLabel: string;
  /** Value matched against chip data attribute for scroll-into-view */
  activeChipId?: string;
  /** Attribute on chip elements, e.g. data-category-id or data-scroll-chip-id */
  chipIdAttribute?: string;
  className?: string;
  scrollClassName?: string;
  /** Tailwind gradient start color for edge fades */
  fadeFromClassName?: string;
  /** Re-run scroll metrics when this changes (e.g. item count) */
  itemCount?: number;
}

export function ScrollableChipRow({
  children,
  ariaLabel,
  scrollPrevLabel,
  scrollNextLabel,
  activeChipId,
  chipIdAttribute = 'data-scroll-chip-id',
  className,
  scrollClassName,
  fadeFromClassName = 'from-background/90',
  itemCount,
}: ScrollableChipRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollStart, setCanScrollStart] = useState(false);
  const [canScrollEnd, setCanScrollEnd] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { canScrollStart: start, canScrollEnd: end } = getScrollMetrics(el);
    setCanScrollStart(start);
    setCanScrollEnd(end);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();

    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    el.addEventListener('scroll', updateScrollState, { passive: true });

    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', updateScrollState);
    };
  }, [updateScrollState, itemCount]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || activeChipId === undefined) return;

    const activeEl = container.querySelector<HTMLElement>(`[${chipIdAttribute}="${activeChipId}"]`);
    if (!activeEl) return;

    activeEl.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: prefersReducedMotion ? 'instant' : 'smooth',
    });
  }, [activeChipId, chipIdAttribute, prefersReducedMotion, itemCount]);

  const scrollByAmount = (direction: 'start' | 'end') => {
    const el = scrollRef.current;
    if (!el) return;

    const dir = getInlineScrollDirection();
    const amount = direction === 'start' ? -200 * dir : 200 * dir;
    el.scrollBy({
      left: amount,
      behavior: prefersReducedMotion ? 'instant' : 'smooth',
    });
  };

  const handleScrollKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Home') {
      event.preventDefault();
      scrollRef.current?.scrollTo({
        left: getInlineScrollDirection() === 1 ? 0 : scrollRef.current.scrollWidth,
        behavior: prefersReducedMotion ? 'instant' : 'smooth',
      });
    } else if (event.key === 'End') {
      event.preventDefault();
      const el = scrollRef.current;
      if (!el) return;
      const dir = getInlineScrollDirection();
      el.scrollTo({
        left: dir === 1 ? el.scrollWidth : 0,
        behavior: prefersReducedMotion ? 'instant' : 'smooth',
      });
    }
  };

  return (
    <div className={cn('relative flex items-center', className)}>
      {canScrollStart && (
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-y-0 start-0 z-10 w-10 bg-gradient-to-r to-transparent rtl:bg-gradient-to-l',
            fadeFromClassName
          )}
        />
      )}
      {canScrollEnd && (
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-y-0 end-0 z-10 w-10 bg-gradient-to-l to-transparent rtl:bg-gradient-to-r',
            fadeFromClassName
          )}
        />
      )}

      {canScrollStart && (
        <button
          type="button"
          onClick={() => scrollByAmount('start')}
          aria-label={scrollPrevLabel}
          className="border-border/60 bg-background/95 text-foreground hover:border-brand-accent/40 hover:text-brand-accent focus-visible:ring-ring absolute start-0 z-20 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden />
        </button>
      )}

      <div
        ref={scrollRef}
        className={cn(
          'scrollbar-none flex flex-1 gap-2 overflow-x-auto',
          'pe-[max(1rem,env(safe-area-inset-right))] ps-[max(0px,env(safe-area-inset-left))]',
          canScrollStart && 'ps-12',
          canScrollEnd && 'pe-12',
          scrollClassName
        )}
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={handleScrollKeyDown}
      >
        {children}
      </div>

      {canScrollEnd && (
        <button
          type="button"
          onClick={() => scrollByAmount('end')}
          aria-label={scrollNextLabel}
          className="border-border/60 bg-background/95 text-foreground hover:border-brand-accent/40 hover:text-brand-accent focus-visible:ring-ring absolute end-0 z-20 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <ChevronRight className="h-5 w-5 rtl:rotate-180" aria-hidden />
        </button>
      )}
    </div>
  );
}
