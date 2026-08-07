'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCategoriesWithProducts } from '@/hooks/useCategories';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
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
import { CartDrawer } from '@/components/cart/CartDrawer';
import { useFavorites } from '@/hooks/useFavorites';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useCartStore } from '@/stores/cart-store';
import { parseDiningModeParam, persistDiningMode, readStoredDiningMode } from '@/lib/dining-mode';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Product } from '@/types/database';
import { generateMenuSchema } from '@/lib/seo/structuredData';
import {
  trackPageView,
  trackProductView,
  trackCategoryView,
  trackQRScan,
  trackCartOpen,
} from '@/lib/analytics';

export function MenuPageClient() {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <MenuContent />
    </Suspense>
  );
}

function MenuContent() {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get('table');
  const modeParam = searchParams.get('mode');
  const { data: categories, isLoading, error, refetch } = useCategoriesWithProducts();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [lightboxProduct, setLightboxProduct] = useState<Product | null>(null);
  const { locale } = useI18n();
  const t = useTranslations('menu');
  const tCart = useTranslations('cart');
  const prefersReducedMotion = useReducedMotion();
  const setMeta = useCartStore((s) => s.setMeta);
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  const [diningMode, setDiningMode] = useState<'dining' | 'takeaway'>(() => {
    const fromUrl = parseDiningModeParam(modeParam);
    if (fromUrl) return fromUrl;
    return readStoredDiningMode();
  });

  const { toggleFavorite, isFavorite, count: favoriteCount } = useFavorites();
  const { addRecent } = useRecentlyViewed();

  useEffect(() => {
    trackPageView('menu');
  }, []);

  useEffect(() => {
    const parsed = parseDiningModeParam(modeParam);
    if (parsed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync dining mode from URL
      setDiningMode(parsed);
      persistDiningMode(parsed);
      setMeta({ diningMode: parsed });
    }
  }, [modeParam, setMeta]);

  useEffect(() => {
    setMeta({ diningMode });
  }, [diningMode, setMeta]);

  useEffect(() => {
    if (activeCategory && categories) {
      const cat = categories.find((c) => c.id === activeCategory);
      if (cat) trackCategoryView(cat.id, cat.name_en, cat.name_ar);
    }
  }, [activeCategory, categories]);

  useEffect(() => {
    if (tableParam) {
      localStorage.setItem('warda-table', tableParam);
      setMeta({ tableNumber: tableParam });
      trackQRScan(parseInt(tableParam, 10));
    } else {
      const saved = localStorage.getItem('warda-table');
      if (saved) setMeta({ tableNumber: saved });
    }
  }, [tableParam, setMeta]);

  const handleDiningModeChange = useCallback(
    (mode: 'dining' | 'takeaway') => {
      setDiningMode(mode);
      persistDiningMode(mode);
      setMeta({ diningMode: mode });
    },
    [setMeta]
  );

  const openCart = useCallback(() => {
    trackCartOpen(useCartStore.getState().items.reduce((n, i) => n + i.quantity, 0));
    setCartOpen(true);
  }, []);

  const handleProductClick = useCallback(
    (product: Product) => {
      trackProductView(
        product.id,
        product.name_en,
        product.name_ar,
        product.category_id,
        undefined
      );
      addRecent(product);
      setLightboxProduct(product);
    },
    [addRecent]
  );

  const handleImageClick = useCallback((product: Product) => {
    setLightboxProduct(product);
  }, []);

  const handleRecentlyViewedClick = useCallback(
    (productId: string) => {
      if (!categories) return;
      for (const cat of categories) {
        const found = cat.products.find((p) => p.id === productId);
        if (found) {
          handleProductClick(found);
          break;
        }
      }
    },
    [categories, handleProductClick]
  );

  if (isLoading) return <MenuSkeleton />;
  if (error) {
    return (
      <div className="container mx-auto px-4 py-16">
        <ErrorState error={error} retry={refetch} />
      </div>
    );
  }
  if (!categories?.length) {
    return (
      <div className="container mx-auto px-4 py-16">
        <EmptyState title={t('menuComingSoon')} description={t('menuComingSoonDesc')} />
      </div>
    );
  }

  const filteredCategories = activeCategory
    ? categories.filter((c) => c.id === activeCategory)
    : categories;

  return (
    <div className="bg-background min-h-screen pb-20 md:pb-[env(safe-area-inset-bottom)]">
      <MenuHeader
        tableParam={tableParam}
        diningMode={diningMode}
        onDiningModeChange={handleDiningModeChange}
        onSearchOpen={() => setSearchOpen(true)}
        onCartOpen={openCart}
        favoriteCount={favoriteCount}
      />

      <CategoryNav
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {activeCategory === null && <OffersSection />}

      <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6">
        {filteredCategories.map((category) => (
          <MotionSection key={category.id} className="mb-6 sm:mb-8">
            <div className="mb-3 sm:mb-4">
              <h2
                id={`category-${category.id}`}
                className="font-heading text-lg font-bold sm:text-xl"
              >
                {getName(locale, category.name_en, category.name_ar)}
              </h2>
              {category.description_en && (
                <p className="text-muted-foreground text-sm">
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

      <ImageLightbox product={lightboxProduct} onClose={() => setLightboxProduct(null)} />

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />

      <AnimatePresence>
        {cartCount > 0 && (
          <motion.button
            type="button"
            initial={prefersReducedMotion ? undefined : { y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={openCart}
            className="bg-primary text-primary-foreground fixed bottom-4 left-1/2 z-30 flex h-12 -translate-x-1/2 items-center gap-2 rounded-full px-5 text-sm font-semibold shadow-lg md:hidden"
            aria-label={tCart('openCart')}
            data-testid="cart-fab"
          >
            <ShoppingCart className="h-4 w-4" />
            <span aria-live="polite">{tCart('cartCount', { count: cartCount })}</span>
          </motion.button>
        )}
      </AnimatePresence>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateMenuSchema()) }}
      />
    </div>
  );
}
