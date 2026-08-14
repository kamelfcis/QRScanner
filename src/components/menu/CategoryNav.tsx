'use client';

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
    'inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-semibold transition-colors',
    isActive
      ? 'border-aklet-ink bg-aklet-ink text-aklet-paper'
      : 'border-aklet-line/80 text-aklet-ink-soft hover:border-aklet-ink/40 hover:text-aklet-ink bg-transparent'
  );

export function CategoryNav({ categories, activeCategory, onCategoryChange }: CategoryNavProps) {
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useI18n();
  const t = useTranslations('menu');

  const handleClick = (categoryId: string | null) => {
    onCategoryChange(categoryId);
    if (categoryId) {
      document.getElementById(`category-${categoryId}`)?.scrollIntoView({
        behavior: prefersReducedMotion ? 'instant' : 'smooth',
        block: 'start',
      });
    } else {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'instant' : 'smooth' });
    }
  };

  return (
    <nav className="bg-aklet-paper/92 border-aklet-line/70 sticky top-[calc(var(--aklet-header-h)+env(safe-area-inset-top))] z-30 border-b backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-3 sm:px-5">
        <ScrollableChipRow
          ariaLabel={t('menuCategories')}
          scrollPrevLabel={t('scrollCategoriesPrev')}
          scrollNextLabel={t('scrollCategoriesNext')}
          activeChipId={activeCategory ?? 'all'}
          chipIdAttribute="data-category-id"
          scrollClassName="py-2.5"
          fadeFromClassName="from-aklet-paper"
          itemCount={categories.length}
        >
          <button
            type="button"
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
            return (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                data-category-id={category.id}
                onClick={() => handleClick(category.id)}
                className={chipClassName(isActive)}
              >
                {category.image_url && (
                  <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full">
                    <NextImage
                      src={category.image_url}
                      alt=""
                      width={20}
                      height={20}
                      className="h-5 w-5 object-cover"
                    />
                  </span>
                )}
                {getName(locale, category.name_en, category.name_ar)}
              </button>
            );
          })}
        </ScrollableChipRow>
      </div>
    </nav>
  );
}
