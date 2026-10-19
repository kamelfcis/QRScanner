'use client';

import { useTopProducts } from '@/hooks/useAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { productTerm } from '@/lib/i18n/product-terminology';

interface TrendingDishesProps {
  period: string;
}

export function TrendingDishes({ period }: TrendingDishesProps) {
  const { data: products, isLoading } = useTopProducts(period, 5);
  const tRaw = useTranslations('analytics');
  const t = (key: string) => productTerm(tRaw, key);

  if (isLoading) return <div className="bg-muted h-[300px] animate-pulse rounded-lg" />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{t('trendingDishes')}</CardTitle>
        <TrendingUp className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        {!products?.length ? (
          <p className="text-muted-foreground py-4 text-center text-sm">{t('noDataYet')}</p>
        ) : (
          <div className="space-y-3">
            {products.map((product, i) => (
              <div key={product.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-5 text-sm font-medium">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{product.name}</p>
                    {product.name_ar && (
                      <p className="text-muted-foreground text-xs" dir="rtl">
                        {product.name_ar}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant="secondary">{product.views} views</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
