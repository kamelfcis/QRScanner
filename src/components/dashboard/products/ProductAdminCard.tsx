'use client';

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Image } from '@/components/shared/Image';
import { formatCurrencyAmount } from '@/lib/order/format-currency';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

export function ProductPriceSummary({
  product,
  currency,
  t,
}: {
  product: Pick<
    Product,
    'dining_price' | 'takeaway_price' | 'has_size_options' | 'price_per_kg' | 'weight_options_g'
  >;
  currency: string;
  t: TranslateFn;
}) {
  return (
    <div className="space-y-0.5 tabular-nums">
      {product.price_per_kg != null && product.weight_options_g?.length ? (
        <>
          <p className="text-muted-foreground text-xs">{t('pricePerKg')}</p>
          <p className="font-semibold">
            {formatCurrencyAmount(product.price_per_kg, currency, { plain: true })}
          </p>
          <p className="text-muted-foreground text-xs">{t('fromPrice')}</p>
          <p className="text-muted-foreground font-medium">
            {formatCurrencyAmount(product.dining_price, currency, { plain: true })}
          </p>
        </>
      ) : product.has_size_options ? (
        <>
          <p className="text-muted-foreground text-xs">{t('smallPrice')}</p>
          <p className="font-semibold">
            {formatCurrencyAmount(product.dining_price, currency, { plain: true })}
          </p>
          <p className="text-muted-foreground text-xs">{t('largePrice')}</p>
          <p className="text-muted-foreground font-medium">
            {formatCurrencyAmount(product.takeaway_price, currency, { plain: true })}
          </p>
        </>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">{t('price')}</p>
          <p className="font-semibold">
            {formatCurrencyAmount(product.dining_price, currency, { plain: true })}
          </p>
        </>
      )}
    </div>
  );
}

interface ProductAdminCardProps {
  product: Product;
  productName: string;
  secondaryName: string;
  categoryName: string;
  currency: string;
  locale: string;
  t: TranslateFn;
  tMenu: TranslateFn;
  actions: ReactNode;
}

export function ProductAdminCard({
  product,
  productName,
  secondaryName,
  categoryName,
  currency,
  locale,
  t,
  tMenu,
  actions,
}: ProductAdminCardProps) {
  const initial = productName.charAt(0).toUpperCase();

  return (
    <Card className="border-border/60 bg-card/80 gap-0 overflow-hidden py-0 shadow-sm">
      <div className="bg-muted/40 relative aspect-square overflow-hidden">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={productName}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className={cn('object-cover', !product.is_available && 'opacity-70')}
            containerClassName="absolute inset-0"
          />
        ) : (
          <div
            className={cn(
              'from-muted/60 to-muted flex h-full w-full items-center justify-center bg-gradient-to-br',
              !product.is_available && 'opacity-70'
            )}
            title={t('noImage')}
          >
            <span className="font-heading text-muted-foreground/45 text-5xl font-semibold">
              {initial}
            </span>
          </div>
        )}
        <Badge
          variant={product.is_available ? 'default' : 'secondary'}
          className="absolute end-2 top-2 shadow-sm"
        >
          {product.is_available ? t('available') : t('unavailable')}
        </Badge>
      </div>

      <div className="min-w-0 space-y-2 p-3">
        <div className="min-w-0 space-y-1">
          <p className="font-heading text-base font-medium leading-snug">{productName}</p>
          {secondaryName && (
            <p className="text-muted-foreground text-sm" dir={locale === 'ar' ? 'ltr' : 'rtl'}>
              {secondaryName}
            </p>
          )}
        </div>

        <span className="border-border/50 bg-muted/30 inline-flex max-w-full truncate rounded-full border px-2.5 py-0.5 text-xs">
          {categoryName}
        </span>

        <div className="flex flex-wrap gap-1">
          {product.is_popular && (
            <Badge
              variant="default"
              className="bg-orange-500/90 text-[10px] text-white dark:bg-orange-600"
            >
              {tMenu('popular')}
            </Badge>
          )}
          {product.is_new && (
            <Badge
              variant="default"
              className="bg-blue-500/90 text-[10px] text-white dark:bg-blue-600"
            >
              {tMenu('new')}
            </Badge>
          )}
          {product.is_bestseller && (
            <Badge
              variant="default"
              className="bg-purple-500/90 text-[10px] text-white dark:bg-purple-600"
            >
              {tMenu('bestseller')}
            </Badge>
          )}
          {product.is_spicy && (
            <Badge variant="outline" className="text-[10px]">
              {t('spicy')}
            </Badge>
          )}
        </div>

        <ProductPriceSummary product={product} currency={currency} t={t} />
      </div>

      <div className="border-border/50 bg-muted/25 border-t p-2">{actions}</div>
    </Card>
  );
}
