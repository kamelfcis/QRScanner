'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCategoriesWithProducts } from '@/hooks/useCategories';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getName } from '@/lib/utils';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { MenuThemeScope } from '@/components/menu/MenuThemeScope';
import { MenuHeader } from '@/components/menu/MenuHeader';
import { MenuHero } from '@/components/menu/MenuHero';
import { MenuUtilityBar } from '@/components/menu/MenuUtilityBar';
import { CategoryNav } from '@/components/menu/CategoryNav';
import { ProductGrid } from '@/components/menu/ProductGrid';
import { OffersSection } from '@/components/menu/OffersSection';
import { RecentlyViewed } from '@/components/menu/RecentlyViewed';
import { RecommendedDishes } from '@/components/menu/RecommendedDishes';
import { SearchOverlay } from '@/components/menu/SearchOverlay';
import { ProductSheet } from '@/components/menu/ProductSheet';
import { MenuGridSkeleton, MenuSkeleton } from '@/components/menu/MenuSkeleton';
import { OrderBar } from '@/components/menu/OrderBar';
import { CartDrawer } from '@/components/cart/CartDrawer';
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
import type { Product } from '@/types/database';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { generateMenuSchema } from '@/lib/seo/structuredData';
import { trackPageView, trackProductView, trackCategoryView, trackCartOpen } from '@/lib/analytics';
import { getFulfillmentOptions, resolveOrderModes } from '@/lib/order/order-modes';
import { hashSeed, shuffleCopy } from '@/lib/menu/shuffle-catalog';

export function MenuPageClient() {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <MenuContent />
    </Suspense>
  );
}

function MenuContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableParam = searchParams.get('table');
  const modeParam = searchParams.get('mode');
  const cartParam = searchParams.get('cart');
  const { data: categories, isLoading, error, refetch } = useCategoriesWithProducts();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [allShuffleSeed, setAllShuffleSeed] = useState(() => Date.now());
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const { data: settings } = useRestaurantSettings();
  const orderModes = useMemo(() => resolveOrderModes(settings), [settings]);
  const { locale } = useI18n();
  const t = useTranslations('menu');
  const setMeta = useCartStore((s) => s.setMeta);

  // URL only on first render — localStorage sync runs in useEffect to avoid hydration #418.
  const [diningMode, setDiningMode] = useState<'dining' | 'takeaway'>(() => {
    return parseDiningModeParam(modeParam) ?? 'dining';
  });

  const { toggleFavorite, isFavorite, count: favoriteCount } = useFavorites();
  const { addRecent } = useRecentlyViewed();

  useEffect(() => {
    trackPageView('menu');
  }, []);

  useEffect(() => {
    const fromUrl = parseDiningModeParam(modeParam);
    let next = fromUrl ?? readStoredDiningMode();
    if (!orderModes.dineIn) {
      next = 'takeaway';
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync dining mode after hydration
    setDiningMode(next);
    if (fromUrl && orderModes.dineIn) persistDiningMode(fromUrl);
    if (!orderModes.dineIn) persistDiningMode('takeaway');
    setMeta({ diningMode: next });
  }, [modeParam, setMeta, orderModes.dineIn]);

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
      setMeta({ tableNumber: tableParam });
    } else {
      const saved = readStoredTableNumber();
      if (saved) setMeta({ tableNumber: saved });
    }
  }, [tableParam, setMeta]);

  useEffect(() => {
    if (!settings) return;
    const options = getFulfillmentOptions(orderModes);
    if (options.length === 0) return;
    const current = useCartStore.getState().fulfillmentType;
    if (options.includes(current)) return;
    const fallback = options[0];
    setMeta({
      fulfillmentType: fallback,
      ...(fallback === 'pickup' ? { deliveryAddress: '' } : {}),
    });
  }, [settings, orderModes, setMeta]);

  useEffect(() => {
    if (cartParam !== '1') return;

    const openCartFromQuery = () => {
      const items = useCartStore.getState().items;
      if (items.length === 0) return;
      trackCartOpen(items.reduce((n, i) => n + i.quantity, 0));
      setCartOpen(true);
    };

    if (useCartStore.persist.hasHydrated()) {
      openCartFromQuery();
      router.replace('/menu', { scroll: false });
      return;
    }

    const unsub = useCartStore.persist.onFinishHydration(() => {
      openCartFromQuery();
      router.replace('/menu', { scroll: false });
    });
    return unsub;
  }, [cartParam, router]);

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
      setDetailProduct(product);
    },
    [addRecent]
  );

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

  const handleCategoryChange = useCallback((next: string | null) => {
    setActiveCategory((prev) => {
      if (next === null && prev !== null) {
        setAllShuffleSeed(Date.now());
      }
      return next;
    });
  }, []);

  const filteredCategories = useMemo(() => {
    const catalog = categories ?? [];
    if (activeCategory) {
      return catalog.filter((c) => c.id === activeCategory);
    }
    return shuffleCopy(catalog, allShuffleSeed).map((category) => ({
      ...category,
      products: shuffleCopy(category.products, allShuffleSeed ^ hashSeed(category.id)),
    }));
  }, [activeCategory, categories, allShuffleSeed]);
  const hasCatalog = Boolean(categories?.length);

  return (
    <div
      data-menu-theme
      className="min-h-screen bg-[var(--menu-paper)] pb-24 md:pb-[env(safe-area-inset-bottom)]"
    >
      <MenuThemeScope />
      <QrScanTracker />

      <MenuHeader
        tableParam={tableParam}
        diningMode={diningMode}
        onDiningModeChange={handleDiningModeChange}
        onSearchOpen={() => setSearchOpen(true)}
        onCartOpen={openCart}
        favoriteCount={favoriteCount}
      />

      <MenuHero />

      <MenuUtilityBar
        tableParam={tableParam}
        diningMode={diningMode}
        onDiningModeChange={handleDiningModeChange}
        onSearchOpen={() => setSearchOpen(true)}
      />

      {hasCatalog && (
        <CategoryNav
          categories={categories!}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
        />
      )}

      {hasCatalog && <OffersSection compact={activeCategory !== null} />}

      {isLoading && <MenuGridSkeleton />}

      {!isLoading && error && (
        <div className="mx-auto max-w-6xl px-4 py-16">
          <ErrorState error={error} retry={refetch} />
        </div>
      )}

      {!isLoading && !error && !hasCatalog && (
        <div className="mx-auto max-w-6xl px-4 py-16">
          <EmptyState title={t('menuComingSoon')} description={t('menuComingSoonDesc')} />
        </div>
      )}

      {filteredCategories.length > 0 && (
        <div className="mx-auto max-w-6xl px-3 py-6 sm:px-5 sm:py-8">
          {filteredCategories.map((category) => {
            const categoryName = getName(
              locale,
              category.name_en,
              category.name_ar,
              category.name_fr,
              category.name_nl
            );
            const categoryDescription = category.description_en
              ? getName(
                  locale,
                  category.description_en,
                  category.description_ar,
                  category.description_fr,
                  category.description_nl
                )
              : '';

            return (
              <section key={category.id} className="mb-9 last:mb-0 sm:mb-12">
                <header className="mb-4 sm:mb-5">
                  <div className="flex items-center gap-3">
                    <h2
                      id={`category-${category.id}`}
                      className="font-heading scroll-mt-[calc(var(--menu-header-h)+3.5rem)] text-[19px] font-semibold leading-tight text-[var(--menu-ink)] sm:text-2xl"
                    >
                      {categoryName}
                    </h2>
                    <span aria-hidden className="menu-rule h-px flex-1" />
                  </div>
                  {categoryDescription && (
                    <p className="mt-1.5 max-w-[60ch] text-xs leading-relaxed text-[var(--menu-ink-soft)] sm:text-sm">
                      {categoryDescription}
                    </p>
                  )}
                </header>

                {category.products.length > 0 ? (
                  <ProductGrid
                    products={category.products}
                    diningMode={diningMode}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                    onImageClick={handleProductClick}
                  />
                ) : (
                  <p className="rounded-xl border border-dashed border-[var(--menu-line-strong)] px-4 py-8 text-center text-sm text-[var(--menu-ink-soft)]">
                    {t('emptyCategory')}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}

      <RecentlyViewed onSelectProduct={handleRecentlyViewedClick} />
      <RecommendedDishes onSelectProduct={handleRecentlyViewedClick} />

      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectProduct={handleProductClick}
      />

      <ProductSheet
        product={detailProduct}
        diningMode={diningMode}
        onClose={() => setDetailProduct(null)}
      />

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />

      <OrderBar onOpenCart={openCart} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateMenuSchema(settings, locale)) }}
      />
    </div>
  );
}
