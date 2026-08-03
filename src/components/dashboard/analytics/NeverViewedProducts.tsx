'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const supabase = createClient();

export function NeverViewedProducts() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'never-viewed'],
    queryFn: async () => {
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, name_en, name_ar, is_available')
        .eq('is_available', true);

      if (prodError) throw prodError;

      const { data: analytics, error: anaError } = await supabase
        .from('analytics')
        .select('event_data')
        .eq('event_type', 'product_view');

      if (anaError) throw anaError;

      const viewedIds = new Set(
        (analytics || [])
          .map((a) => (a.event_data as Record<string, unknown>)?.product_id as string)
          .filter(Boolean)
      );

      return (products || []).filter((p) => !viewedIds.has(p.id)).slice(0, 10);
    },
    staleTime: 60 * 1000,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Never Viewed Products</CardTitle>
        <EyeOff className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">All products have been viewed!</p>
        ) : (
          <div className="space-y-2">
            {data.map((product) => (
              <div key={product.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{product.name_en}</p>
                  {product.name_ar && (
                    <p className="text-xs text-muted-foreground" dir="rtl">{product.name_ar}</p>
                  )}
                </div>
                <Badge variant="outline" className="text-orange-500">0 views</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
