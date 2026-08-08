'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import NextImage from 'next/image';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getName, cn } from '@/lib/utils';
import type { CategoryWithProducts } from '@/types/database';

interface CategoryNavProps {
  categories: CategoryWithProducts[];
  activeCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
}

function getScrollMetrics(element: HTMLElement) {
  const { scrollLeft, scrollWidth, clientWidth } = element;
  const maxScroll = Math.max(0, scrollWidth - clientWidth);

  if (maxScroll <= 0) {
    return { canScrollStart: false, canScrollEnd: false };
  }

  const isRtl = document.documentElement.dir === 'rtl';
  let scrollPosition: number;

  if (isRtl) {
    if (scrollLeft <= 0) {
      scrollPosition = Math.abs(scrollLeft);
    } else {
      scrollPosition = maxScroll - scrollLeft;
    }
  } else {
    scrollPosition = scrollLeft;
  }

  return {
    canScrollStart: scrollPosition > 1,
    canScrollEnd: scrollPosition < maxScroll - 1,
  };
}

function getInlineScrollDirection(): number {
  return document.documentElement.dir === 'rtl' ? -1 : 1;
}

const chipClassName = (isActive: boolean) =>
  cn(
    'inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'border-brand-accent bg-brand-accent text-on-accent shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--brand-accent)_55%,transparent)]'
      : 'border-border/60 bg-muted/40 text-muted-foreground hover:border-brand-accent/40 hover:text-foreground'
  );

export function CategoryNav({ categories, activeCategory, onCategoryChange }: CategoryNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollStart, setCanScrollStart] = useState(false);
  const [canScrollEnd, setCanScrollEnd] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useI18n();
  const t = useTranslations('menu');

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
  }, [updateScrollState, categories.length]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const categoryId = activeCategory ?? 'all';
    const activeEl = container.querySelector<HTMLElement>(`[data-category-id="${categoryId}"]`);
    if (!activeEl) return;

    activeEl.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: prefersReducedMotion ? 'instant' : 'smooth',
    });
  }, [activeCategory, prefersReducedMotion, categories.length]);

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

  const handleClick = (categoryId: string | null) => {
    onCategoryChange(categoryId);
    if (categoryId) {
      const section = document.getElementById(`category-${categoryId}`);
      if (section) {
        section.scrollIntoView({
          behavior: prefersReducedMotion ? 'instant' : 'smooth',
          block: 'start',
        });
      }
    } else {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? 'instant' : 'smooth',
      });
    }
  };

  return (
    <motion.nav
      initial={prefersReducedMotion ? undefined : { y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="bg-background/90 border-border/60 dark:border-border/40 sticky top-16 z-30 border-b backdrop-blur-xl"
    >
      <div className="via-brand-accent/50 absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent" />
      <div className="container mx-auto px-4">
        <div className="relative flex items-center">
          {canScrollStart && (
            <div
              aria-hidden
              className="from-background/90 pointer-events-none absolute inset-y-0 start-0 z-10 w-10 bg-gradient-to-r to-transparent rtl:bg-gradient-to-l"
            />
          )}
          {canScrollEnd && (
            <div
              aria-hidden
              className="from-background/90 pointer-events-none absolute inset-y-0 end-0 z-10 w-10 bg-gradient-to-l to-transparent rtl:bg-gradient-to-r"
            />
          )}

          {canScrollStart && (
            <button
              type="button"
              onClick={() => scrollByAmount('start')}
              aria-label={t('scrollCategoriesPrev')}
              className="border-border/60 bg-background/95 text-foreground hover:border-brand-accent/40 hover:text-brand-accent absolute start-0 z-20 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border shadow-sm transition-colors"
            >
              <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
            </button>
          )}

          <div
            ref={scrollRef}
            className={cn(
              'scrollbar-none flex flex-1 gap-2 overflow-x-auto py-3',
              'pe-[max(1rem,env(safe-area-inset-right))] ps-[max(0px,env(safe-area-inset-left))]',
              canScrollStart && 'ps-12',
              canScrollEnd && 'pe-12'
            )}
            role="tablist"
            aria-label={t('menuCategories')}
          >
            <button
              role="tab"
              aria-selected={activeCategory === null}
              data-category-id="all"
              onClick={() => handleClick(null)}
              className={chipClassName(activeCategory === null)}
            >
              {t('allCategories')}
            </button>
            {categories.map((category) => {
              const isActive = activeCategory === category.id;
              const label = getName(locale, category.name_en, category.name_ar);

              return (
                <button
                  key={category.id}
                  role="tab"
                  aria-selected={isActive}
                  data-category-id={category.id}
                  onClick={() => handleClick(category.id)}
                  className={chipClassName(isActive)}
                >
                  {category.image_url && (
                    <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full">
                      <NextImage
                        src={category.image_url}
                        alt=""
                        width={24}
                        height={24}
                        className="h-6 w-6 object-cover"
                      />
                    </span>
                  )}
                  {label}
                </button>
              );
            })}
          </div>

          {canScrollEnd && (
            <button
              type="button"
              onClick={() => scrollByAmount('end')}
              aria-label={t('scrollCategoriesNext')}
              className="border-border/60 bg-background/95 text-foreground hover:border-brand-accent/40 hover:text-brand-accent absolute end-0 z-20 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border shadow-sm transition-colors"
            >
              <ChevronRight className="h-5 w-5 rtl:rotate-180" />
            </button>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
