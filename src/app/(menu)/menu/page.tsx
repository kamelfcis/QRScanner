'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCategoriesWithProducts } from '@/hooks/useCategories';
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

export default function PublicMenuPage() {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get('table');
  const { data: categories, isLoading, error, refetch } = useCategoriesWithProducts();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [diningMode, setDiningMode] = useState<'dining' | 'takeaway'>('dining');
  const [searchOpen, setSearchOpen] = useState(false);
  const [lightboxProduct, setLightboxProduct] = useState<Product | null>(null);

  const { toggleFavorite, isFavorite, count: favoriteCount } = useFavorites();
  const { addRecent } = useRecentlyViewed();

  useEffect(() => {
    if (tableParam) {
      sessionStorage.setItem('warda-table', tableParam);
    }
  }, [tableParam]);

  const handleProductClick = useCallback((product: Product) => {
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
        onDiningModeChange={setDiningMode}
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
                {category.name_en}
              </h2>
              {category.description_en && (
                <p className="text-sm text-muted-foreground">
                  {category.description_en}
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
