'use client';

import { useTopProducts } from '@/hooks/useAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TrendingDishesProps {
  period: string;
}

export function TrendingDishes({ period }: TrendingDishesProps) {
  const { data: products, isLoading } = useTopProducts(period, 5);

  if (isLoading) return <div className="h-[300px] bg-muted animate-pulse rounded-lg" />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Trending Dishes</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {!products?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
        ) : (
          <div className="space-y-3">
            {products.map((product, i) => (
              <div key={product.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground w-5">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{product.name}</p>
                    {product.name_ar && (
                      <p className="text-xs text-muted-foreground" dir="rtl">{product.name_ar}</p>
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
