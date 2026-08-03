'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCategoriesWithProducts } from '@/hooks/useCategories';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/shared/Image';
import { Flame, Star, Sparkles, Utensils, ShoppingBag } from 'lucide-react';

export default function PublicMenuPage() {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get('table');
  const { data: categories, isLoading, error, refetch } = useCategoriesWithProducts();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [diningMode, setDiningMode] = useState<'dining' | 'takeaway'>('dining');

  useEffect(() => {
    if (tableParam) {
      sessionStorage.setItem('warda-table', tableParam);
    }
  }, [tableParam]);

  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorState error={error} retry={refetch} />;
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
      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-primary">Warda Shamya Menu</h1>
              {tableParam && (
                <Badge variant="secondary" className="text-sm">
                  Table {tableParam}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2" role="group" aria-label="Dining mode">
              <Button
                variant={diningMode === 'dining' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDiningMode('dining')}
                aria-pressed={diningMode === 'dining'}
              >
                <Utensils className="mr-2 h-4 w-4" />
                Dine In
              </Button>
              <Button
                variant={diningMode === 'takeaway' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDiningMode('takeaway')}
                aria-pressed={diningMode === 'takeaway'}
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                Takeaway
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-[72px] z-30 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4">
          <div
            className="flex gap-2 overflow-x-auto py-3 scrollbar-none"
            role="tablist"
            aria-label="Menu categories"
          >
            <Button
              variant={activeCategory === null ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveCategory(null)}
              className="whitespace-nowrap"
              role="tab"
              aria-selected={activeCategory === null}
              aria-controls="menu-content"
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveCategory(category.id)}
                className="whitespace-nowrap"
                role="tab"
                aria-selected={activeCategory === category.id}
                aria-controls="menu-content"
              >
                {category.name_en}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div id="menu-content" role="tabpanel" className="container mx-auto px-4 py-6">
        {filteredCategories.map((category) => (
          <section key={category.id} className="mb-8" aria-labelledby={`category-${category.id}`}>
            <div className="mb-4">
              <h2 id={`category-${category.id}`} className="text-xl font-bold">{category.name_en}</h2>
              {category.description_en && (
                <p className="text-sm text-muted-foreground">{category.description_en}</p>
              )}
            </div>

            {category.banner_url && (
              <div className="relative mb-4 aspect-[21/9] w-full overflow-hidden rounded-lg">
                <Image
                  src={category.banner_url}
                  alt={category.name_en}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {category.products.map((product) => (
                <Card key={product.id} className="overflow-hidden transition-shadow hover:shadow-md">
                  {product.image_url && (
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                      <Image
                        src={product.image_url}
                        alt={product.name_en}
                        fill
                        className="object-cover transition-transform duration-300 hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                      <div className="absolute left-2 top-2 flex gap-1">
                        {product.is_popular && (
                          <Badge className="bg-orange-500">
                            <Star className="mr-1 h-3 w-3" />
                            Popular
                          </Badge>
                        )}
                        {product.is_new && (
                          <Badge className="bg-blue-500">
                            <Sparkles className="mr-1 h-3 w-3" />
                            New
                          </Badge>
                        )}
                        {product.is_bestseller && (
                          <Badge className="bg-purple-500">
                            <Star className="mr-1 h-3 w-3" />
                            Bestseller
                          </Badge>
                        )}
                        {product.is_spicy && (
                          <Badge className="bg-red-500">
                            <Flame className="mr-1 h-3 w-3" />
                            Spicy
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{product.name_en}</h3>
                        <p className="text-sm text-muted-foreground" dir="rtl">
                          {product.name_ar}
                        </p>
                      </div>
                    </div>
                    {product.description_en && (
                      <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                        {product.description_en}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-primary">
                        {diningMode === 'dining' ? product.dining_price : product.takeaway_price} SAR
                      </p>
                      {!product.is_available && (
                        <Badge variant="secondary" aria-label="Currently unavailable">Unavailable</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
