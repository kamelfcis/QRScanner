'use client';

import { motion } from 'framer-motion';
import NextImage from 'next/image';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { ScrollableChipRow } from '@/components/shared/ScrollableChipRow';
import { getName, cn } from '@/lib/utils';
import type { CategoryWithProducts } from '@/types/database';

interface CategoryNavProps {
  categories: CategoryWithProducts[];
  activeCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
}

const chipClassName = (isActive: boolean) =>
  cn(
    'inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'border-brand-accent bg-brand-accent text-on-accent shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--brand-accent)_55%,transparent)]'
      : 'border-border/60 bg-muted/40 text-muted-foreground hover:border-brand-accent/40 hover:text-foreground'
  );

export function CategoryNav({ categories, activeCategory, onCategoryChange }: CategoryNavProps) {
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useI18n();
  const t = useTranslations('menu');

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
        <ScrollableChipRow
          ariaLabel={t('menuCategories')}
          scrollPrevLabel={t('scrollCategoriesPrev')}
          scrollNextLabel={t('scrollCategoriesNext')}
          activeChipId={activeCategory ?? 'all'}
          chipIdAttribute="data-category-id"
          scrollClassName="py-3"
          fadeFromClassName="from-background/90"
          itemCount={categories.length}
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
        </ScrollableChipRow>
      </div>
    </motion.nav>
  );
}
