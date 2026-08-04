'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n } from '@/components/providers/RootI18nProvider';
import { getName } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { CategoryWithProducts } from '@/types/database';

interface CategoryNavProps {
  categories: CategoryWithProducts[];
  activeCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
}

export function CategoryNav({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useI18n();

  const handleClick = (categoryId: string | null) => {
    onCategoryChange(categoryId);
    if (categoryId) {
      const section = document.getElementById(`category-${categoryId}`);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <motion.nav
      initial={prefersReducedMotion ? undefined : { y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-16 z-30 border-b bg-background/95 backdrop-blur"
    >
      <div className="container mx-auto px-4">
        <div
          ref={scrollRef}
          className="scrollbar-none flex gap-1 overflow-x-auto py-3"
          role="tablist"
          aria-label="Menu categories"
        >
          <button
            role="tab"
            aria-selected={activeCategory === null}
            onClick={() => handleClick(null)}
            className={cn(
              'relative whitespace-nowrap px-3 py-2.5 text-sm min-h-[44px] font-medium transition-colors',
              activeCategory === null
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            All
            {activeCategory === null && (
              <motion.div
                layoutId="category-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              role="tab"
              aria-selected={activeCategory === category.id}
              onClick={() => handleClick(category.id)}
              className={cn(
                'relative whitespace-nowrap px-3 py-2.5 text-sm min-h-[44px] font-medium transition-colors',
                activeCategory === category.id
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {getName(locale, category.name_en, category.name_ar)}
              {activeCategory === category.id && (
                <motion.div
                  layoutId="category-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </motion.nav>
  );
}
