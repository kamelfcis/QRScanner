'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const supabase = createClient();

export function FavoriteProducts() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'favorite-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name_en, name_ar, is_popular, is_bestseller')
        .eq('is_available', true)
        .order('is_popular', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Popular Dishes</CardTitle>
        <Heart className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">No popular dishes yet</p>
        ) : (
          <div className="space-y-2">
            {data.map((product) => (
              <div key={product.id} className="flex items-center justify-between">
                <p className="text-sm font-medium">{product.name_en}</p>
                <div className="flex gap-1">
                  {product.is_popular && <Badge className="bg-brand-primary/10 text-brand-primary">Popular</Badge>}
                  {product.is_bestseller && <Badge className="bg-brand-secondary/10 text-brand-secondary">Bestseller</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
