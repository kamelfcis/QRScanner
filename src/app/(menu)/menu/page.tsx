'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCategoriesWithProducts } from '@/hooks/useCategories';
import { useI18n } from '@/components/providers/RootI18nProvider';
import { getName } from '@/lib/utils';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { MotionSection } from '@/components/shared/motion';
import { MenuHeader } from '@/components/menu/MenuHeader';
import { CategoryNav } from '@/components/menu/CategoryNav';
import { ProductGrid } from '@/components/menu/ProductGrid';
import { OffersSection } from '@/components/menu/OffersSection';
import { RecentlyViewed } from '@/components/menu/RecentlyViewed';
import { RecommendedDishes } from '@/components/menu/RecommendedDishes';
import { SearchOverlay } from '@/components/menu/SearchOverlay';
import { ImageLightbox } from '@/components/menu/ImageLightbox';
import { MenuSkeleton } from '@/components/menu/MenuSkeleton';
import { useFavorites } from '@/hooks/useFavorites';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import type { Product } from '@/types/database';
import { generateMenuSchema } from '@/lib/seo/structuredData';
import { trackPageView, trackProductView, trackCategoryView, trackQRScan } from '@/lib/analytics';

export default function PublicMenuPage() {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <MenuContent />
    </Suspense>
  );
}

function MenuContent() {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get('table');
  const modeParam = searchParams.get('mode') as 'dining' | 'takeaway' | null;
  const { data: categories, isLoading, error, refetch } = useCategoriesWithProducts();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [lightboxProduct, setLightboxProduct] = useState<Product | null>(null);
  const { locale } = useI18n();

  const [diningMode, setDiningMode] = useState<'dining' | 'takeaway'>(() => {
    if (modeParam === 'dining' || modeParam === 'takeaway') return modeParam;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('warda-dining-mode');
      if (saved === 'dining' || saved === 'takeaway') return saved;
    }
    return 'dining';
  });

  const { toggleFavorite, isFavorite, count: favoriteCount } = useFavorites();
  const { addRecent } = useRecentlyViewed();

  useEffect(() => {
    trackPageView('menu');
  }, []);

  useEffect(() => {
    if (activeCategory && categories) {
      const cat = categories.find(c => c.id === activeCategory);
      if (cat) trackCategoryView(cat.id, cat.name_en, cat.name_ar);
    }
  }, [activeCategory, categories]);

  useEffect(() => {
    if (tableParam) {
      localStorage.setItem('warda-table', tableParam);
      trackQRScan(parseInt(tableParam, 10));
    }
  }, [tableParam]);

  const handleDiningModeChange = useCallback((mode: 'dining' | 'takeaway') => {
    setDiningMode(mode);
    localStorage.setItem('warda-dining-mode', mode);
  }, []);

  const handleProductClick = useCallback((product: Product) => {
    trackProductView(product.id, product.name_en, product.name_ar, product.category_id, undefined);
    addRecent(product);
    setLightboxProduct(product);
  }, [addRecent]);

  const handleImageClick = useCallback((product: Product) => {
    setLightboxProduct(product);
  }, []);

  const handleRecentlyViewedClick = useCallback((productId: string) => {
    if (!categories) return;
    for (const cat of categories) {
      const found = cat.products.find((p) => p.id === productId);
      if (found) {
        handleProductClick(found);
        break;
      }
    }
  }, [categories, handleProductClick]);

  if (isLoading) return <MenuSkeleton />;
  if (error) return (
    <div className="container mx-auto px-4 py-16">
      <ErrorState error={error} retry={refetch} />
    </div>
  );
  if (!categories?.length) {
    return (
      <div className="container mx-auto px-4 py-16">
        <EmptyState
          title="Menu coming soon"
          description="We are preparing our delicious menu for you."
        />
      </div>
    );
  }

  const filteredCategories = activeCategory
    ? categories.filter((c) => c.id === activeCategory)
    : categories;

  return (
    <div className="min-h-screen bg-background">
      <MenuHeader
        tableParam={tableParam}
        diningMode={diningMode}
        onDiningModeChange={handleDiningModeChange}
        onSearchOpen={() => setSearchOpen(true)}
        favoriteCount={favoriteCount}
      />

      <CategoryNav
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {activeCategory === null && <OffersSection />}

      <div className="container mx-auto px-4 py-6">
        {filteredCategories.map((category) => (
          <MotionSection
            key={category.id}
            className="mb-8"
          >
            <div className="mb-4">
              <h2
                id={`category-${category.id}`}
                className="text-xl font-bold"
              >
                {getName(locale, category.name_en, category.name_ar)}
              </h2>
              {category.description_en && (
                <p className="text-sm text-muted-foreground">
                  {getName(locale, category.description_en, category.description_ar)}
                </p>
              )}
            </div>

            <ProductGrid
              products={category.products}
              diningMode={diningMode}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
              onImageClick={handleImageClick}
            />
          </MotionSection>
        ))}
      </div>

      <RecentlyViewed onSelectProduct={handleRecentlyViewedClick} />
      <RecommendedDishes onSelectProduct={handleRecentlyViewedClick} />

      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectProduct={handleProductClick}
      />

      <ImageLightbox
        product={lightboxProduct}
        onClose={() => setLightboxProduct(null)}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateMenuSchema()) }}
      />
    </div>
  );
}
