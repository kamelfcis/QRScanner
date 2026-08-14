'use client';

import { useEffect } from 'react';
import { SearchX } from 'lucide-react';
import { useSearchProducts } from '@/hooks/useProducts';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { trackSearch } from '@/lib/analytics';
import { getCategoryKind } from '@/lib/market/catalog';
import { ProductGrid } from './ProductGrid';
import type { Product, ProductWithGallery } from '@/types/database';

interface SearchResultsProps {
  query: string;
  diningMode: 'dining' | 'takeaway';
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (product: Product) => void;
  onOpenDetails: (product: Product) => void;
  onClear: () => void;
}

export function SearchResults({
  query,
  diningMode,
  isFavorite,
  onToggleFavorite,
  onOpenDetails,
  onClear,
}: SearchResultsProps) {
  const t = useTranslations('menu');
  const { data: results, isLoading } = useSearchProducts(query);

  useEffect(() => {
    if (results !== undefined) trackSearch(query, results.length);
  }, [query, results]);

  const products = (results ?? []) as ProductWithGallery[];

  return (
    <section className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6" aria-live="polite">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-base font-bold text-[var(--hm-ink)] sm:text-lg">
          {t('searchResultsFor', { query })}
        </h2>
        {!isLoading && (
          <span className="text-xs tabular-nums text-[var(--hm-ink-soft)]">
            {t('resultsCount', { count: products.length })}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-[var(--hm-radius)] border border-[var(--hm-line)] bg-[var(--hm-surface-muted)]"
            />
          ))}
        </div>
      ) : products.length > 0 ? (
        <ProductGrid
          products={products}
          diningMode={diningMode}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
          onOpenDetails={onOpenDetails}
          categoryKind={(product) =>
            getCategoryKind(
              (product as ProductWithGallery).category?.name_en,
              (product as ProductWithGallery).category?.name_ar
            )
          }
        />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-[var(--hm-radius)] border border-dashed border-[var(--hm-line-strong)] bg-[var(--hm-surface)] px-6 py-12 text-center">
          <SearchX className="h-8 w-8 text-[var(--hm-ink-faint)]" aria-hidden="true" />
          <p className="text-sm font-semibold text-[var(--hm-ink)]">
            {t('noResultsFor', { query })}
          </p>
          <p className="max-w-xs text-xs text-[var(--hm-ink-soft)]">{t('noResultsHint')}</p>
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-[var(--hm-line-strong)] px-4 py-2 text-xs font-semibold text-[var(--hm-ink)] transition-colors hover:border-[var(--hm-primary)] hover:text-[var(--hm-primary)]"
          >
            {t('clearSearch')}
          </button>
        </div>
      )}
    </section>
  );
}
