'use client';

import { motion } from 'framer-motion';
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
    'relative inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-1 pb-2.5 pt-3 text-[13px] transition-colors sm:text-sm',
    isActive
      ? 'font-semibold text-[var(--menu-ink)]'
      : 'font-normal text-[var(--menu-ink-soft)] hover:text-[var(--menu-ink)]'
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

  const renderChip = (id: string | null, label: string) => {
    const isActive = activeCategory === id;
    return (
      <button
        key={id ?? 'all'}
        role="tab"
        aria-selected={isActive}
        data-category-id={id ?? 'all'}
        onClick={() => handleClick(id)}
        className={chipClassName(isActive)}
      >
        {label}
        {isActive && (
          <motion.span
            aria-hidden
            layoutId={prefersReducedMotion ? undefined : 'menu-category-underline'}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 bottom-1.5 h-[2px] rounded-full bg-[var(--menu-gold)]"
          />
        )}
      </button>
    );
  };

  return (
    <nav className="bg-background/94 sticky top-[var(--menu-header-h)] z-30 border-b border-[var(--menu-line)] backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-3 sm:px-5">
        <ScrollableChipRow
          ariaLabel={t('menuCategories')}
          scrollPrevLabel={t('scrollCategoriesPrev')}
          scrollNextLabel={t('scrollCategoriesNext')}
          activeChipId={activeCategory ?? 'all'}
          chipIdAttribute="data-category-id"
          scrollClassName="gap-5 sm:gap-7"
          fadeFromClassName="from-background"
          arrowClassName="h-9 w-9 border-[var(--menu-line-strong)] bg-[var(--menu-surface)] text-[var(--menu-ink-soft)] hover:border-[var(--menu-gold-soft)] hover:text-[var(--menu-ink)]"
          itemCount={categories.length}
        >
          {renderChip(null, t('allCategories'))}
          {categories.map((category) =>
            renderChip(category.id, getName(locale, category.name_en, category.name_ar))
          )}
        </ScrollableChipRow>
      </div>
    </nav>
  );
}
