'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { productSchema } from '@/types/schema';
import type { ProductInput } from '@/types/schema';
import type { z } from 'zod';
import {
  useAllProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useToggleProductAvailability,
} from '@/hooks/useProducts';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { Product } from '@/types';

type ProductForm = z.input<typeof productSchema>;

const defaultFormValues: ProductForm = {
  name_en: '',
  name_ar: '',
  description_en: '',
  description_ar: '',
  category_id: '',
  dining_price: 0,
  takeaway_price: 0,
  is_available: true,
  is_popular: false,
  is_new: false,
  is_bestseller: false,
  is_spicy: false,
  sort_order: 0,
};

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: products, isLoading, error, refetch } = useAllProducts();
  const { data: categories } = useAllCategories();
  const deleteProduct = useDeleteProduct();
  const updateProduct = useUpdateProduct();
  const createProduct = useCreateProduct();
  const toggleAvailability = useToggleProductAvailability();

  const createForm = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: defaultFormValues,
  });

  const editForm = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: defaultFormValues,
  });

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
        onSuccess: () => {
          setDeleteId(null);
          toast.success('Product deleted successfully');
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to delete product');
        },
      });
    }
  };

  const openCreateDialog = () => {
    createForm.reset(defaultFormValues);
    setShowCreateDialog(true);
  };

  const openEditDialog = (product: Product) => {
    setEditProduct(product);
    editForm.reset({
      name_en: product.name_en,
      name_ar: product.name_ar,
      description_en: product.description_en ?? '',
      description_ar: product.description_ar ?? '',
      category_id: product.category_id,
      dining_price: product.dining_price,
      takeaway_price: product.takeaway_price,
      is_available: product.is_available,
      is_popular: product.is_popular,
      is_new: product.is_new,
      is_bestseller: product.is_bestseller,
      is_spicy: product.is_spicy,
      sort_order: product.sort_order,
    });
  };

  const handleCreate = async (data: ProductForm) => {
    createProduct.mutate(data as ProductInput, {
      onSuccess: () => {
        setShowCreateDialog(false);
        createForm.reset(defaultFormValues);
        toast.success('Product created successfully');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to create product');
      },
    });
  };

  const handleEditSave = async (data: ProductForm) => {
    if (!editProduct) return;
    updateProduct.mutate(
      { id: editProduct.id, input: data as Partial<ProductInput> },
      {
        onSuccess: () => {
          setEditProduct(null);
          editForm.reset(defaultFormValues);
          toast.success('Product updated successfully');
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to update product');
        },
      }
    );
  };

  const handleToggleAvailability = (product: Product) => {
    toggleAvailability.mutate(
      { id: product.id, is_available: !product.is_available },
      {
        onError: (error) => {
          toast.error(error.message || 'Failed to update availability');
        },
      }
    );
  };

  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Products</h1>
          <p className="text-muted-foreground">Manage your menu products.</p>
        </div>
        <Button onClick={openCreateDialog}>
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
          action={!searchQuery ? { label: 'Add Product', onClick: openCreateDialog } : undefined}
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
                    sizes="(max-width: 640px) 100vw, (max-width: 1024) 50vw, 33vw"
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
                    {product.is_popular && <Badge variant="default" className="bg-orange-500 text-white dark:bg-orange-600">Popular</Badge>}
                    {product.is_new && <Badge variant="default" className="bg-blue-500 text-white dark:bg-blue-600">New</Badge>}
                    {product.is_bestseller && <Badge variant="default" className="bg-purple-500 text-white dark:bg-purple-600">Bestseller</Badge>}
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
                    <Switch
                      checked={product.is_available}
                      onCheckedChange={() => handleToggleAvailability(product)}
                      aria-label={`Toggle availability for ${product.name_en}`}
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${product.name_en}`} onClick={() => openEditDialog(product)}>
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

      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) setShowCreateDialog(false); }}>
        <DialogContent className="max-w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="create-name-en">Name (English) *</Label>
              <Input
                id="create-name-en"
                {...createForm.register('name_en')}
              />
              {createForm.formState.errors.name_en && (
                <p className="text-sm text-destructive">{createForm.formState.errors.name_en.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-name-ar">Name (Arabic) *</Label>
              <Input
                id="create-name-ar"
                dir="rtl"
                {...createForm.register('name_ar')}
              />
              {createForm.formState.errors.name_ar && (
                <p className="text-sm text-destructive">{createForm.formState.errors.name_ar.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-desc-en">Description (English)</Label>
              <Textarea
                id="create-desc-en"
                {...createForm.register('description_en')}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-desc-ar">Description (Arabic)</Label>
              <Textarea
                id="create-desc-ar"
                dir="rtl"
                {...createForm.register('description_ar')}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-category">Category *</Label>
              <Select
                value={createForm.watch('category_id')}
                onValueChange={(val) => createForm.setValue('category_id', val ?? '', { shouldValidate: true })}
              >
                <SelectTrigger id="create-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {createForm.formState.errors.category_id && (
                <p className="text-sm text-destructive">{createForm.formState.errors.category_id.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-dining">Dining Price (SAR) *</Label>
                <Input
                  id="create-dining"
                  type="number"
                  min={0}
                  {...createForm.register('dining_price', { valueAsNumber: true })}
                />
                {createForm.formState.errors.dining_price && (
                  <p className="text-sm text-destructive">{createForm.formState.errors.dining_price.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-takeaway">Takeaway Price (SAR) *</Label>
                <Input
                  id="create-takeaway"
                  type="number"
                  min={0}
                  {...createForm.register('takeaway_price', { valueAsNumber: true })}
                />
                {createForm.formState.errors.takeaway_price && (
                  <p className="text-sm text-destructive">{createForm.formState.errors.takeaway_price.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={createForm.watch('is_available')}
                  onCheckedChange={(checked) => createForm.setValue('is_available', checked)}
                  id="create-available"
                />
                <Label htmlFor="create-available">Available</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={createForm.watch('is_popular')}
                  onCheckedChange={(checked) => createForm.setValue('is_popular', checked)}
                  id="create-popular"
                />
                <Label htmlFor="create-popular">Popular</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={createForm.watch('is_new')}
                  onCheckedChange={(checked) => createForm.setValue('is_new', checked)}
                  id="create-new"
                />
                <Label htmlFor="create-new">New</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={createForm.watch('is_bestseller')}
                  onCheckedChange={(checked) => createForm.setValue('is_bestseller', checked)}
                  id="create-bestseller"
                />
                <Label htmlFor="create-bestseller">Bestseller</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={createForm.watch('is_spicy')}
                  onCheckedChange={(checked) => createForm.setValue('is_spicy', checked)}
                  id="create-spicy"
                />
                <Label htmlFor="create-spicy">Spicy</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-sort">Sort Order</Label>
                <Input
                  id="create-sort"
                  type="number"
                  min={0}
                  {...createForm.register('sort_order', { valueAsNumber: true })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createProduct.isPending}>
                {createProduct.isPending ? 'Creating...' : 'Create Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editProduct} onOpenChange={(open) => { if (!open) setEditProduct(null); }}>
        <DialogContent className="max-w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEditSave)} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name-en">Name (English) *</Label>
              <Input
                id="edit-name-en"
                {...editForm.register('name_en')}
              />
              {editForm.formState.errors.name_en && (
                <p className="text-sm text-destructive">{editForm.formState.errors.name_en.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name-ar">Name (Arabic) *</Label>
              <Input
                id="edit-name-ar"
                dir="rtl"
                {...editForm.register('name_ar')}
              />
              {editForm.formState.errors.name_ar && (
                <p className="text-sm text-destructive">{editForm.formState.errors.name_ar.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc-en">Description (English)</Label>
              <Textarea
                id="edit-desc-en"
                {...editForm.register('description_en')}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc-ar">Description (Arabic)</Label>
              <Textarea
                id="edit-desc-ar"
                dir="rtl"
                {...editForm.register('description_ar')}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category *</Label>
              <Select
                value={editForm.watch('category_id')}
                onValueChange={(val) => editForm.setValue('category_id', val ?? '', { shouldValidate: true })}
              >
                <SelectTrigger id="edit-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editForm.formState.errors.category_id && (
                <p className="text-sm text-destructive">{editForm.formState.errors.category_id.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-dining">Dining Price (SAR) *</Label>
                <Input
                  id="edit-dining"
                  type="number"
                  min={0}
                  {...editForm.register('dining_price', { valueAsNumber: true })}
                />
                {editForm.formState.errors.dining_price && (
                  <p className="text-sm text-destructive">{editForm.formState.errors.dining_price.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-takeaway">Takeaway Price (SAR) *</Label>
                <Input
                  id="edit-takeaway"
                  type="number"
                  min={0}
                  {...editForm.register('takeaway_price', { valueAsNumber: true })}
                />
                {editForm.formState.errors.takeaway_price && (
                  <p className="text-sm text-destructive">{editForm.formState.errors.takeaway_price.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={editForm.watch('is_available')}
                  onCheckedChange={(checked) => editForm.setValue('is_available', checked)}
                  id="edit-available"
                />
                <Label htmlFor="edit-available">Available</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editForm.watch('is_popular')}
                  onCheckedChange={(checked) => editForm.setValue('is_popular', checked)}
                  id="edit-popular"
                />
                <Label htmlFor="edit-popular">Popular</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editForm.watch('is_new')}
                  onCheckedChange={(checked) => editForm.setValue('is_new', checked)}
                  id="edit-new"
                />
                <Label htmlFor="edit-new">New</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editForm.watch('is_bestseller')}
                  onCheckedChange={(checked) => editForm.setValue('is_bestseller', checked)}
                  id="edit-bestseller"
                />
                <Label htmlFor="edit-bestseller">Bestseller</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editForm.watch('is_spicy')}
                  onCheckedChange={(checked) => editForm.setValue('is_spicy', checked)}
                  id="edit-spicy"
                />
                <Label htmlFor="edit-spicy">Spicy</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sort">Sort Order</Label>
                <Input
                  id="edit-sort"
                  type="number"
                  min={0}
                  {...editForm.register('sort_order', { valueAsNumber: true })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditProduct(null)}>Cancel</Button>
              <Button type="submit" disabled={updateProduct.isPending}>
                {updateProduct.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
