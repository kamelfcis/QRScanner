'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCategoriesWithProducts } from '@/hooks/useCategories';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getName } from '@/lib/utils';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { MotionSection } from '@/components/shared/motion';
import { AkletThemeScope } from '@/components/menu/AkletThemeScope';
import { AkletHero } from '@/components/menu/AkletHero';
import { MenuHeader } from '@/components/menu/MenuHeader';
import { MenuUtilityBar } from '@/components/menu/MenuUtilityBar';
import { CategoryNav } from '@/components/menu/CategoryNav';
import { ProductGrid } from '@/components/menu/ProductGrid';
import { ProductStrip } from '@/components/menu/ProductStrip';
import { TrayPromoCard } from '@/components/menu/TrayPromoCard';
import { OffersSection } from '@/components/menu/OffersSection';
import { OrderBar } from '@/components/menu/OrderBar';
import { RecentlyViewed } from '@/components/menu/RecentlyViewed';
import { RecommendedDishes } from '@/components/menu/RecommendedDishes';
import { SearchOverlay } from '@/components/menu/SearchOverlay';
import { ProductSheet } from '@/components/menu/ProductSheet';
import { MenuSkeleton } from '@/components/menu/MenuSkeleton';
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
import {
  collectBestsellers,
  collectShrimpProducts,
  findPromoTray,
  getCategoryGroup,
  type AkletGroupId,
} from '@/lib/menu/aklet-groups';
import { QrScanTracker } from '@/components/analytics/QrScanTracker';
import type { Product } from '@/types/database';
import { generateMenuSchema } from '@/lib/seo/structuredData';
import { trackPageView, trackProductView, trackCategoryView, trackCartOpen } from '@/lib/analytics';

const GROUP_LABEL_KEY: Record<AkletGroupId, string> = {
  fish: 'groupFish',
  seafood: 'groupSeafood',
  plates: 'groupPlates',
  cooking: 'groupCooking',
  offers: 'groupOffers',
};

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
  const { data: settings } = useRestaurantSettings();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [sheetProduct, setSheetProduct] = useState<Product | null>(null);
  const { locale } = useI18n();
  const t = useTranslations('menu');
  const setMeta = useCartStore((s) => s.setMeta);

  // First paint reads the URL only; the stored preference is applied after
  // mount so the server and client markup always agree.
  const [diningMode, setDiningMode] = useState<'dining' | 'takeaway'>(
    () => parseDiningModeParam(modeParam) ?? 'dining'
  );

  const { toggleFavorite, isFavorite } = useFavorites();
  const { addRecent } = useRecentlyViewed();

  useEffect(() => {
    trackPageView('menu');
  }, []);

  useEffect(() => {
    const resolved = parseDiningModeParam(modeParam) ?? readStoredDiningMode();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resolve dining mode once the client can read storage
    setDiningMode(resolved);
    persistDiningMode(resolved);
  }, [modeParam]);

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

  const handleDiningModeChange = useCallback((mode: 'dining' | 'takeaway') => {
    setDiningMode(mode);
    persistDiningMode(mode);
  }, []);

  const openCart = useCallback(() => {
    trackCartOpen(useCartStore.getState().items.reduce((n, i) => n + i.quantity, 0));
    setCartOpen(true);
  }, []);

  const openProduct = useCallback(
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
      for (const cat of categories) {
        const found = cat.products.find((p) => p.id === productId);
        if (found) {
          openProduct(found);
          break;
        }
      }
    },
    [categories, openProduct]
  );

  const shrimpPicks = useMemo(() => collectShrimpProducts(categories ?? []), [categories]);
  const bestsellers = useMemo(() => collectBestsellers(categories ?? []), [categories]);
  const promoTray = useMemo(() => findPromoTray(categories ?? []), [categories]);

  if (isLoading) return <MenuSkeleton />;
  if (error) {
    return (
      <div data-aklet-theme className="bg-aklet-paper min-h-screen px-4 py-16">
        <AkletThemeScope />
        <ErrorState error={error} retry={refetch} />
      </div>
    );
  }
  if (!categories?.length) {
    return (
      <div data-aklet-theme className="bg-aklet-paper min-h-screen px-4 py-16">
        <AkletThemeScope />
        <EmptyState title={t('menuComingSoon')} description={t('menuComingSoonDesc')} />
      </div>
    );
  }

  const showDiscovery = activeCategory === null;
  const filteredCategories = activeCategory
    ? categories.filter((c) => c.id === activeCategory)
    : categories;

  return (
    <div
      data-aklet-theme
      className="bg-aklet-paper text-aklet-ink min-h-screen pb-24 md:pb-[env(safe-area-inset-bottom)]"
    >
      <AkletThemeScope />
      <QrScanTracker />

      <MenuHeader
        tableParam={tableParam}
        onSearchOpen={() => setSearchOpen(true)}
        onCartOpen={openCart}
      />

      <AkletHero />

      <MenuUtilityBar
        tableParam={tableParam}
        whatsapp={settings?.whatsapp}
        diningMode={diningMode}
        onDiningModeChange={handleDiningModeChange}
      />

      <CategoryNav
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {showDiscovery && promoTray ? (
        <TrayPromoCard product={promoTray} diningMode={diningMode} onSelectProduct={openProduct} />
      ) : null}

      {showDiscovery && (
        <>
          <ProductStrip
            title={t('shrimpPicks')}
            note={t('shrimpPicksNote')}
            products={shrimpPicks}
            diningMode={diningMode}
            onSelectProduct={openProduct}
          />
          <ProductStrip
            title={t('bestsellers')}
            note={t('bestsellersNote')}
            products={bestsellers}
            diningMode={diningMode}
            onSelectProduct={openProduct}
          />
          <OffersSection />
        </>
      )}

      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-5 sm:py-6">
        {filteredCategories.map((category) => {
          const group = getCategoryGroup(category.name_ar, category.name_en);
          const description = getName(
            locale,
            category.description_en || '',
            category.description_ar || ''
          );

          return (
            <MotionSection key={category.id} className="mb-8 sm:mb-10">
              <div className="mb-3 sm:mb-4">
                {group ? <span className="aklet-kicker">{t(GROUP_LABEL_KEY[group])}</span> : null}
                <h2
                  id={`category-${category.id}`}
                  className="font-heading text-aklet-ink mt-1.5 scroll-mt-32 text-xl font-bold leading-tight sm:text-2xl"
                >
                  {getName(locale, category.name_en, category.name_ar)}
                </h2>
                {description ? (
                  <p className="text-aklet-ink-soft mt-1 max-w-2xl text-xs leading-relaxed sm:text-sm">
                    {description}
                  </p>
                ) : null}
              </div>

              <ProductGrid
                products={category.products}
                diningMode={diningMode}
                isFavorite={isFavorite}
                onToggleFavorite={toggleFavorite}
                onImageClick={openProduct}
              />
            </MotionSection>
          );
        })}
      </div>

      <RecentlyViewed onSelectProduct={handleRecentlyViewedClick} />
      <RecommendedDishes onSelectProduct={handleRecentlyViewedClick} />

      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectProduct={openProduct}
      />

      <ProductSheet product={sheetProduct} onClose={() => setSheetProduct(null)} />

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />

      <OrderBar onOpenCart={openCart} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateMenuSchema()) }}
      />
    </div>
  );
}
