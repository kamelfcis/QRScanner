'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PackageSearch, Star } from 'lucide-react';
import { useCategoriesWithProducts } from '@/hooks/useCategories';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getName } from '@/lib/utils';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { MenuHeader } from '@/components/menu/MenuHeader';
import { MarketSearch } from '@/components/menu/MarketSearch';
import { CategoryNav } from '@/components/menu/CategoryNav';
import { MarketSection } from '@/components/menu/MarketSection';
import { ProductGrid } from '@/components/menu/ProductGrid';
import { OffersSection } from '@/components/menu/OffersSection';
import { RecentlyViewed } from '@/components/menu/RecentlyViewed';
import { SearchResults } from '@/components/menu/SearchResults';
import { ProductSheet } from '@/components/menu/ProductSheet';
import { MenuSkeleton } from '@/components/menu/MenuSkeleton';
import { CartButton } from '@/components/cart/CartButton';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { OrderBar } from '@/components/cart/OrderBar';
import { useFavorites } from '@/hooks/useFavorites';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useCartStore } from '@/stores/cart-store';
import {
  parseDiningModeParam,
  persistDiningMode,
  readStoredDiningMode,
  readStoredTableNumber,
} from '@/lib/dining-mode';
import { QrScanTracker } from '@/components/analytics/QrScanTracker';
import { isDeliveryOnlyMode } from '@/lib/fulfillment-mode';
import {
  getCategoryIcon,
  getCategoryKind,
  isFreshKind,
  type MarketCategoryKind,
} from '@/lib/market/catalog';
import type { CategoryWithProducts, Product } from '@/types/database';
import { generateMenuSchema } from '@/lib/seo/structuredData';
import { trackPageView, trackProductView, trackCategoryView, trackCartOpen } from '@/lib/analytics';

const MIN_SEARCH_LENGTH = 2;
const MAX_BESTSELLERS = 8;

export function MenuPageClient() {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <MenuContent />
    </Suspense>
  );
}

function pickBestsellers(categories: CategoryWithProducts[]): Product[] {
  const bestsellers: Product[] = [];
  const popular: Product[] = [];

  for (const category of categories) {
    for (const product of category.products) {
      if (!product.is_available) continue;
      if (product.is_bestseller) bestsellers.push(product);
      else if (product.is_popular) popular.push(product);
    }
  }

  return [...bestsellers, ...popular].slice(0, MAX_BESTSELLERS);
}

function MenuContent() {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get('table');
  const modeParam = searchParams.get('mode');
  const { data: categories, isLoading, error, refetch } = useCategoriesWithProducts();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [sheetProduct, setSheetProduct] = useState<Product | null>(null);
  const { locale } = useI18n();
  const t = useTranslations('menu');
  const deliveryOnly = isDeliveryOnlyMode();
  const setMeta = useCartStore((s) => s.setMeta);

  // Wholesale has no dine-in service: the menu always behaves as delivery/takeaway.
  const [diningMode, setDiningMode] = useState<'dining' | 'takeaway'>('takeaway');

  const { toggleFavorite, isFavorite } = useFavorites();
  const { addRecent } = useRecentlyViewed();

  useEffect(() => {
    trackPageView('menu');
  }, []);

  useEffect(() => {
    if (deliveryOnly) {
      persistDiningMode('takeaway');
      setMeta({ diningMode: 'takeaway', fulfillmentType: 'delivery' });
      return;
    }
    // Resolve the stored/URL mode after mount so SSR and hydration agree.
    const resolved = parseDiningModeParam(modeParam) ?? readStoredDiningMode();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync dining mode from URL/storage
    setDiningMode(resolved);
    persistDiningMode(resolved);
    setMeta({ diningMode: resolved });
  }, [modeParam, setMeta, deliveryOnly]);

  useEffect(() => {
    if (activeCategory && categories) {
      const category = categories.find((item) => item.id === activeCategory);
      if (category) trackCategoryView(category.id, category.name_en, category.name_ar);
    }
  }, [activeCategory, categories]);

  useEffect(() => {
    if (tableParam) {
      setMeta({ tableNumber: tableParam });
    } else {
      const saved = readStoredTableNumber();
      if (saved) setMeta({ tableNumber: saved });
    }
  }, [tableParam, setMeta]);

  const openCart = useCallback(() => {
    trackCartOpen(useCartStore.getState().items.reduce((total, item) => total + item.quantity, 0));
    setCartOpen(true);
  }, []);

  const kindByCategoryId = useMemo(() => {
    const map = new Map<string, MarketCategoryKind>();
    for (const category of categories ?? []) {
      map.set(category.id, getCategoryKind(category.name_en, category.name_ar));
    }
    return map;
  }, [categories]);

  const resolveProductKind = useCallback(
    (product: Product): MarketCategoryKind => kindByCategoryId.get(product.category_id) ?? 'other',
    [kindByCategoryId]
  );

  const openDetails = useCallback(
    (product: Product) => {
      trackProductView(
        product.id,
        product.name_en,
        product.name_ar,
        product.category_id,
        undefined
      );
      addRecent(product);
      setSheetProduct(product);
    },
    [addRecent]
  );

  const handleRecentlyViewedClick = useCallback(
    (productId: string) => {
      if (!categories) return;
      for (const category of categories) {
        const found = category.products.find((product) => product.id === productId);
        if (found) {
          openDetails(found);
          break;
        }
      }
    },
    [categories, openDetails]
  );

  const trimmedQuery = query.trim();
  const searching = trimmedQuery.length >= MIN_SEARCH_LENGTH;

  const bestsellers = useMemo(() => (categories ? pickBestsellers(categories) : []), [categories]);

  if (isLoading) return <MenuSkeleton />;

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ErrorState error={error} retry={refetch} />
      </div>
    );
  }

  if (!categories?.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState title={t('menuComingSoon')} description={t('menuComingSoonDesc')} />
      </div>
    );
  }

  const visibleCategories = activeCategory
    ? categories.filter((category) => category.id === activeCategory)
    : categories;

  return (
    <div className="min-h-screen bg-[var(--hm-paper)] pb-24 md:pb-10">
      <QrScanTracker />

      <MenuHeader tableParam={tableParam} />

      <div className="bg-[var(--hm-surface)]/95 sticky top-0 z-40 border-b border-[var(--hm-line)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2 sm:px-4">
          <MarketSearch value={query} onChange={setQuery} className="min-w-0 flex-1" />
          <CartButton onClick={openCart} />
        </div>
        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
      </div>

      {searching ? (
        <SearchResults
          query={trimmedQuery}
          diningMode={diningMode}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
          onOpenDetails={openDetails}
          onClear={() => setQuery('')}
        />
      ) : (
        <>
          {activeCategory === null && <OffersSection />}

          <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-5">
            {activeCategory === null && bestsellers.length > 0 && (
              <MarketSection title={t('bestsellers')} icon={Star}>
                <ProductGrid
                  products={bestsellers}
                  diningMode={diningMode}
                  isFavorite={isFavorite}
                  onToggleFavorite={toggleFavorite}
                  onOpenDetails={openDetails}
                  categoryKind={resolveProductKind}
                />
              </MarketSection>
            )}

            {visibleCategories.map((category) => {
              const kind = kindByCategoryId.get(category.id) ?? 'other';
              return (
                <MarketSection
                  key={category.id}
                  id={`category-${category.id}`}
                  title={getName(locale, category.name_en, category.name_ar)}
                  description={
                    category.description_en || category.description_ar
                      ? getName(
                          locale,
                          category.description_en || '',
                          category.description_ar || ''
                        )
                      : null
                  }
                  count={category.products.length}
                  countLabel={t('itemsCount', { count: category.products.length })}
                  icon={getCategoryIcon(kind)}
                  fresh={isFreshKind(kind)}
                >
                  {category.products.length > 0 ? (
                    <ProductGrid
                      products={category.products}
                      diningMode={diningMode}
                      isFavorite={isFavorite}
                      onToggleFavorite={toggleFavorite}
                      onOpenDetails={openDetails}
                      categoryKind={kind}
                    />
                  ) : (
                    <p className="flex items-center gap-2 rounded-[var(--hm-radius)] border border-dashed border-[var(--hm-line-strong)] px-4 py-6 text-sm text-[var(--hm-ink-soft)]">
                      <PackageSearch className="h-4 w-4" aria-hidden="true" />
                      {t('noProducts')}
                    </p>
                  )}
                </MarketSection>
              );
            })}
          </div>

          <RecentlyViewed onSelectProduct={handleRecentlyViewedClick} />
        </>
      )}

      <ProductSheet
        product={sheetProduct}
        categoryKind={sheetProduct ? resolveProductKind(sheetProduct) : 'other'}
        diningMode={diningMode}
        onClose={() => setSheetProduct(null)}
      />

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <OrderBar diningMode={diningMode} onOpenCart={openCart} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateMenuSchema()) }}
      />
    </div>
  );
}
