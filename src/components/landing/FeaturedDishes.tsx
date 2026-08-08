'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MotionSection, MotionCard } from '@/components/shared/motion';
import { Image } from '@/components/shared/Image';
import { usePopularProducts } from '@/hooks/useProducts';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { cn, getName } from '@/lib/utils';
import { formatCurrencyAmount, getRestaurantCurrency } from '@/lib/order/format-currency';
import type { Product } from '@/types/database';

function preferImageUrl(products: Product[]): Product[] {
  const withImage: Product[] = [];
  const withoutImage: Product[] = [];
  for (const product of products) {
    if (product.image_url) withImage.push(product);
    else withoutImage.push(product);
  }
  return [...withImage, ...withoutImage];
}

function pickBadge(product: Product): 'bestseller' | 'popular' | 'new' | null {
  if (product.is_bestseller) return 'bestseller';
  if (product.is_popular) return 'popular';
  if (product.is_new) return 'new';
  return null;
}

export function FeaturedDishes() {
  const { data: products, isLoading } = usePopularProducts();
  const t = useTranslations('landing');
  const menuT = useTranslations('menu');
  const { locale } = useI18n();
  const { data: settings } = useRestaurantSettings();
  const currency = getRestaurantCurrency(settings?.currency);
  const currencyLocale = locale === 'ar' ? 'ar' : 'en';

  const sortedProducts = useMemo(() => (products ? preferImageUrl(products) : []), [products]);

  const badgeLabel = (badge: 'bestseller' | 'popular' | 'new') => {
    if (badge === 'bestseller') return menuT('bestseller');
    if (badge === 'new') return menuT('new');
    return menuT('popular');
  };

  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--brand-accent)_8%,transparent),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(0,0,0,0.04),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--brand-accent)_10%,transparent),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.02),transparent_50%)]"
      />

      <div className="container relative mx-auto px-4">
        <MotionSection>
          <div className="mb-10 text-center md:mb-12">
            <h2 className="font-heading text-primary text-4xl font-bold md:text-5xl">
              {t('signatureDishes')}
            </h2>
            <div className="bg-brand-accent mx-auto mt-4 h-1 w-20 rounded" />
            <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm md:text-base">
              {t('signatureDishesSubtitle')}
            </p>
          </div>
        </MotionSection>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="border-border/50 bg-card/80 overflow-hidden rounded-2xl border shadow-sm"
              >
                <Skeleton className="aspect-square w-full rounded-none" />
                <div className="space-y-2 p-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <p className="text-muted-foreground text-center">{t('noFeaturedDishes')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {sortedProducts.map((product, index) => {
              const name = getName(locale, product.name_en, product.name_ar);
              const secondaryName = locale === 'ar' ? product.name_en : product.name_ar;
              const badge = pickBadge(product);

              return (
                <MotionCard key={product.id} delay={index * 0.05}>
                  <Link
                    href="/welcome"
                    className="border-border/50 bg-card/80 hover:border-brand-accent/40 group block h-full overflow-hidden rounded-2xl border shadow-sm transition-colors"
                  >
                    <div className="relative aspect-square overflow-hidden">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={name}
                          fill
                          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                          containerClassName="absolute inset-0 h-full w-full"
                        />
                      ) : (
                        <div className="bg-muted flex h-full items-center justify-center">
                          <span className="font-heading text-muted-foreground/30 text-3xl font-bold">
                            {name.charAt(0)}
                          </span>
                        </div>
                      )}
                      {badge && (
                        <div className="absolute start-2 top-2 z-[1]">
                          <Badge className="bg-brand-accent/90 px-1.5 py-0.5 text-[10px] text-black sm:text-xs">
                            {badgeLabel(badge)}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 p-3">
                      <h3 className="font-heading text-foreground line-clamp-2 text-sm font-bold md:text-base">
                        {name}
                      </h3>
                      {secondaryName ? (
                        <p
                          className="text-muted-foreground hidden truncate text-xs sm:block"
                          dir={locale === 'ar' ? 'ltr' : 'rtl'}
                        >
                          {secondaryName}
                        </p>
                      ) : null}
                      <p className="text-brand-accent text-sm font-medium tabular-nums">
                        {formatCurrencyAmount(product.dining_price, currency, {
                          locale: currencyLocale,
                        })}
                      </p>
                    </div>
                  </Link>
                </MotionCard>
              );
            })}
          </div>
        )}

        <MotionSection delay={0.3}>
          <div className="mt-10 text-center">
            <Link
              href="/welcome"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'bg-brand-accent hover:bg-brand-accent/90 rounded-full px-8 text-base font-semibold text-black'
              )}
            >
              {t('viewFullMenu')}
            </Link>
          </div>
        </MotionSection>
      </div>
    </section>
  );
}
