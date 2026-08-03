'use client';

import { useState } from 'react';
import { useAllProducts, useDeleteProduct } from '@/hooks/useProducts';
import { useAllCategories } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { ConfirmDialog } from '@/components/shared/feedback/ConfirmDialog';
import { Plus, Search } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image } from '@/components/shared/Image';
import { Pencil, Trash2 } from 'lucide-react';

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { data: products, isLoading, error, refetch } = useAllProducts();
  const { data: categories } = useAllCategories();
  const deleteProduct = useDeleteProduct();

  const filteredProducts = products?.filter((product) => {
    const matchesSearch =
      product.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.name_ar.includes(searchQuery);
    const matchesCategory =
      categoryFilter === 'all' || product.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = () => {
    if (deleteId) {
      deleteProduct.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your menu products.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search products"
          />
        </div>
        <div>
          <Label htmlFor="category-filter" className="sr-only">Filter by category</Label>
          <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value ?? 'all')}>
            <SelectTrigger id="category-filter" className="w-full sm:w-[180px]" aria-label="Filter by category">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!filteredProducts?.length ? (
        <EmptyState
          title="No products found"
          description={searchQuery ? 'Try a different search term.' : 'Create your first product to get started.'}
          action={!searchQuery ? { label: 'Add Product', onClick: () => {} } : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              {product.image_url && (
                <div className="aspect-video w-full overflow-hidden">
                  <Image
                    src={product.image_url}
                    alt={product.name_en}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{product.name_en}</CardTitle>
                    <p className="text-sm text-muted-foreground" dir="rtl">
                      {product.name_ar}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {product.is_popular && <Badge variant="default" className="bg-orange-500">Popular</Badge>}
                    {product.is_new && <Badge variant="default" className="bg-blue-500">New</Badge>}
                    {product.is_bestseller && <Badge variant="default" className="bg-purple-500">Bestseller</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {product.description_en && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description_en}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Dining</p>
                      <p className="font-semibold">{product.dining_price} SAR</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Takeaway</p>
                      <p className="font-semibold">{product.takeaway_price} SAR</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${product.name_en}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteId(product.id)}
                      aria-label={`Delete ${product.name_en}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {!product.is_available && (
                  <Badge variant="secondary" className="mt-2">Unavailable</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleteProduct.isPending}
      />
    </div>
  );
}
