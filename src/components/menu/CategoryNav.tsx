'use client';

import { ShoppingBasket } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { ScrollableChipRow } from '@/components/shared/ScrollableChipRow';
import { getCategoryIcon, getCategoryKind } from '@/lib/market/catalog';
import { getName, cn } from '@/lib/utils';
import type { CategoryWithProducts } from '@/types/database';

interface CategoryNavProps {
  categories: CategoryWithProducts[];
  activeCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
}

const chipClassName = (isActive: boolean) =>
  cn(
    'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[13px] font-medium transition-colors',
    isActive
      ? 'border-[var(--hm-primary)] bg-[var(--hm-primary)] text-white'
      : 'border-[var(--hm-line-strong)] bg-[var(--hm-surface)] text-[var(--hm-ink-soft)] hover:border-[var(--hm-primary)] hover:text-[var(--hm-primary)]'
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
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'instant' : 'smooth' });
  };

  return (
    <nav className="mx-auto max-w-7xl px-3 sm:px-4">
      <ScrollableChipRow
        ariaLabel={t('menuCategories')}
        scrollPrevLabel={t('scrollCategoriesPrev')}
        scrollNextLabel={t('scrollCategoriesNext')}
        activeChipId={activeCategory ?? 'all'}
        chipIdAttribute="data-category-id"
        scrollClassName="pb-2.5 pt-0.5"
        fadeFromClassName="from-[var(--hm-surface)]"
        itemCount={categories.length}
      >
        <button
          role="tab"
          aria-selected={activeCategory === null}
          data-category-id="all"
          onClick={() => handleClick(null)}
          className={chipClassName(activeCategory === null)}
        >
          <ShoppingBasket className="h-4 w-4" aria-hidden="true" />
          {t('allCategories')}
        </button>

        {categories.map((category) => {
          const isActive = activeCategory === category.id;
          const Icon = getCategoryIcon(getCategoryKind(category.name_en, category.name_ar));

          return (
            <button
              key={category.id}
              role="tab"
              aria-selected={isActive}
              data-category-id={category.id}
              onClick={() => handleClick(category.id)}
              className={chipClassName(isActive)}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {getName(locale, category.name_en, category.name_ar)}
            </button>
          );
        })}
      </ScrollableChipRow>
    </nav>
  );
}
