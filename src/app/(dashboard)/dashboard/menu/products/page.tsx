'use client';

import { useRef, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
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
import { useRestaurantSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { ConfirmDialog } from '@/components/shared/feedback/ConfirmDialog';
import { Plus, Search, Upload, X } from 'lucide-react';
import { uploadImage, generateStoragePath } from '@/lib/upload';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
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
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { formatCurrencyAmount, getRestaurantCurrency } from '@/lib/order/format-currency';
import { cn, getName } from '@/lib/utils';

type ProductForm = z.input<typeof productSchema>;

const defaultFormValues: ProductForm = {
  name_en: '',
  name_ar: '',
  description_en: '',
  description_ar: '',
  category_id: '',
  image_url: null,
  dining_price: 0,
  takeaway_price: 0,
  is_available: true,
  is_popular: false,
  is_new: false,
  is_bestseller: false,
  is_spicy: false,
  sort_order: 0,
};

function ProductImageField({
  form,
  uploading,
  onUploadClick,
  onRemove,
  t,
  tCommon,
}: {
  form: UseFormReturn<ProductForm>;
  uploading: boolean;
  onUploadClick: () => void;
  onRemove: () => void;
  t: (key: string) => string;
  tCommon: (key: string) => string;
}) {
  const imageUrl = form.watch('image_url');

  return (
    <div className="space-y-2">
      <Label>{t('productImage')}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={onUploadClick} disabled={uploading}>
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? tCommon('uploading') : imageUrl ? t('changeImage') : t('addImage')}
        </Button>
        {imageUrl && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={uploading}>
            <X className="mr-1 h-4 w-4" />
            {t('removeImage')}
          </Button>
        )}
      </div>
      {form.formState.errors.image_url && (
        <p className="text-destructive text-sm">{form.formState.errors.image_url.message}</p>
      )}
      {imageUrl && (
        <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-md border">
          <Image
            src={imageUrl}
            alt={t('productImagePreview')}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 512px"
          />
        </div>
      )}
    </div>
  );
}

const categoryChipClassName = (isActive: boolean) =>
  cn(
    'inline-flex min-h-[36px] shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
    isActive
      ? 'border-brand-accent bg-brand-accent text-on-accent shadow-[0_0_16px_-4px_color-mix(in_srgb,var(--brand-accent)_50%,transparent)]'
      : 'border-border/60 bg-muted/30 text-muted-foreground hover:border-brand-accent/40 hover:text-foreground'
  );

function ProductThumbnail({
  imageUrl,
  name,
  noImageLabel,
}: {
  imageUrl: string | null;
  name: string;
  noImageLabel: string;
}) {
  return (
    <div
      className="border-border/50 bg-muted/40 ring-border/30 relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border ring-1"
      title={imageUrl ? name : noImageLabel}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes="48px"
          className="object-cover"
          containerClassName="absolute inset-0"
        />
      ) : (
        <div className="from-muted/60 to-muted flex h-full w-full items-center justify-center bg-gradient-to-br">
          <span className="font-heading text-muted-foreground/45 text-base font-semibold">
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeFormRef = useRef<'create' | 'edit'>('create');
  const t = useTranslations('products');
  const tCommon = useTranslations('common');
  const tMenu = useTranslations('menu');
  const { locale } = useI18n();

  const { data: products, isLoading, error, refetch } = useAllProducts();
  const { data: categories } = useAllCategories();
  const { data: settings } = useRestaurantSettings();
  const currency = getRestaurantCurrency(settings?.currency);
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
    const matchesCategory = categoryFilter === 'all' || product.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const hasActiveFilters = searchQuery.length > 0 || categoryFilter !== 'all';
  const totalProducts = products?.length ?? 0;
  const visibleCount = filteredProducts?.length ?? 0;

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
      image_url: product.image_url,
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = activeFormRef.current === 'create' ? createForm : editForm;
    setUploading(true);
    try {
      const path = generateStoragePath('products', file.name);
      const result = await uploadImage({ bucket: 'products', path, file });
      form.setValue('image_url', result.url, { shouldValidate: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('uploadFailed'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openImagePicker = (formType: 'create' | 'edit') => {
    activeFormRef.current = formType;
    fileInputRef.current?.click();
  };

  const removeImage = (form: UseFormReturn<ProductForm>) => {
    form.setValue('image_url', null, { shouldValidate: true });
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
          <h1 className="text-2xl font-bold md:text-3xl">{t('title')}</h1>
          <p className="text-muted-foreground">{t('searchProducts')}</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="me-2 h-4 w-4" />
          {t('addProduct')}
        </Button>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-border/60 bg-background/80 ps-9"
            aria-label={t('searchProducts')}
          />
        </div>

        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {t('filterByCategory')}
          </p>
          <div
            className="scrollbar-none flex gap-2 overflow-x-auto pb-1"
            role="tablist"
            aria-label={t('filterByCategory')}
          >
            <button
              type="button"
              role="tab"
              aria-selected={categoryFilter === 'all'}
              onClick={() => setCategoryFilter('all')}
              className={categoryChipClassName(categoryFilter === 'all')}
            >
              {t('allCategories')}
            </button>
            {categories?.map((category) => {
              const label = getName(locale, category.name_en, category.name_ar);
              const isActive = categoryFilter === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setCategoryFilter(category.id)}
                  className={categoryChipClassName(isActive)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {totalProducts > 0 && (
          <p className="text-muted-foreground text-xs tabular-nums">
            {t('showingCount', { count: visibleCount, total: totalProducts })}
          </p>
        )}
      </div>

      {!filteredProducts?.length ? (
        <EmptyState
          title={t('noProducts')}
          description={hasActiveFilters ? t('noProductsFiltered') : t('addProduct')}
          action={
            !hasActiveFilters ? { label: t('addProduct'), onClick: openCreateDialog } : undefined
          }
        />
      ) : (
        <Card className="border-border/60 bg-card/80 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-border/60 bg-muted/25 border-b">
                  <th className="text-muted-foreground w-16 p-3 text-start font-medium">
                    <span className="sr-only">{t('productImage')}</span>
                  </th>
                  <th className="text-muted-foreground p-3 text-start font-medium">
                    {t('productColumn')}
                  </th>
                  <th className="text-muted-foreground hidden p-3 text-start font-medium sm:table-cell">
                    {t('category')}
                  </th>
                  <th className="text-muted-foreground p-3 text-start font-medium">
                    {t('pricesColumn')}
                  </th>
                  <th className="text-muted-foreground hidden p-3 text-start font-medium md:table-cell">
                    {t('statusColumn')}
                  </th>
                  <th className="text-muted-foreground p-3 text-end font-medium">
                    {t('actionsColumn')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const productName = getName(locale, product.name_en, product.name_ar);
                  const secondaryName = locale === 'ar' ? product.name_en : product.name_ar;
                  const categoryName = product.category
                    ? getName(locale, product.category.name_en, product.category.name_ar)
                    : '—';

                  return (
                    <tr
                      key={product.id}
                      className="border-border/40 hover:bg-muted/20 border-b transition-colors last:border-0"
                    >
                      <td className="p-3">
                        <ProductThumbnail
                          imageUrl={product.image_url}
                          name={productName}
                          noImageLabel={t('noImage')}
                        />
                      </td>
                      <td className="p-3">
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium leading-snug">{productName}</p>
                          {secondaryName && (
                            <p
                              className="text-muted-foreground text-xs"
                              dir={locale === 'ar' ? 'ltr' : 'rtl'}
                            >
                              {secondaryName}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1 pt-0.5 sm:hidden">
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {categoryName}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1 pt-0.5">
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
                        </div>
                      </td>
                      <td className="text-muted-foreground hidden p-3 sm:table-cell">
                        <span className="border-border/50 bg-muted/30 rounded-full border px-2.5 py-0.5 text-xs">
                          {categoryName}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="space-y-0.5 tabular-nums">
                          <p className="text-muted-foreground text-xs">{tMenu('dining')}</p>
                          <p className="font-semibold">
                            {formatCurrencyAmount(product.dining_price, currency, { plain: true })}
                          </p>
                          <p className="text-muted-foreground text-xs">{tMenu('takeaway')}</p>
                          <p className="text-muted-foreground font-medium">
                            {formatCurrencyAmount(product.takeaway_price, currency, {
                              plain: true,
                            })}
                          </p>
                        </div>
                      </td>
                      <td className="hidden p-3 md:table-cell">
                        <Badge variant={product.is_available ? 'default' : 'secondary'}>
                          {product.is_available ? t('available') : t('unavailable')}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <Switch
                            checked={product.is_available}
                            onCheckedChange={() => handleToggleAvailability(product)}
                            aria-label={`${t('available')} — ${productName}`}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`${tCommon('edit')} ${productName}`}
                            onClick={() => openEditDialog(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive h-8 w-8"
                            onClick={() => setDeleteId(product.id)}
                            aria-label={`${tCommon('delete')} ${productName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          if (!open) setShowCreateDialog(false);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-full overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('addProduct')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="create-name-en">{t('productNameEn')} *</Label>
              <Input id="create-name-en" {...createForm.register('name_en')} />
              {createForm.formState.errors.name_en && (
                <p className="text-destructive text-sm">
                  {createForm.formState.errors.name_en.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-name-ar">{t('productNameAr')} *</Label>
              <Input id="create-name-ar" dir="rtl" {...createForm.register('name_ar')} />
              {createForm.formState.errors.name_ar && (
                <p className="text-destructive text-sm">
                  {createForm.formState.errors.name_ar.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-desc-en">{t('descriptionEn')}</Label>
              <Textarea id="create-desc-en" {...createForm.register('description_en')} rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-desc-ar">{t('descriptionAr')}</Label>
              <Textarea
                id="create-desc-ar"
                dir="rtl"
                {...createForm.register('description_ar')}
                rows={2}
              />
            </div>
            <ProductImageField
              form={createForm}
              uploading={uploading}
              onUploadClick={() => openImagePicker('create')}
              onRemove={() => removeImage(createForm)}
              t={t}
              tCommon={tCommon}
            />
            <div className="space-y-2">
              <Label htmlFor="create-category">{t('category')} *</Label>
              <Select
                value={createForm.watch('category_id')}
                onValueChange={(val) =>
                  createForm.setValue('category_id', val ?? '', { shouldValidate: true })
                }
              >
                <SelectTrigger id="create-category">
                  <SelectValue placeholder={t('selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {getName(locale, c.name_en, c.name_ar)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {createForm.formState.errors.category_id && (
                <p className="text-destructive text-sm">
                  {createForm.formState.errors.category_id.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-dining">
                  {t('diningPrice')} ({currency}) *
                </Label>
                <Input
                  id="create-dining"
                  type="number"
                  min={0}
                  {...createForm.register('dining_price', { valueAsNumber: true })}
                />
                {createForm.formState.errors.dining_price && (
                  <p className="text-destructive text-sm">
                    {createForm.formState.errors.dining_price.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-takeaway">
                  {t('takeawayPrice')} ({currency}) *
                </Label>
                <Input
                  id="create-takeaway"
                  type="number"
                  min={0}
                  {...createForm.register('takeaway_price', { valueAsNumber: true })}
                />
                {createForm.formState.errors.takeaway_price && (
                  <p className="text-destructive text-sm">
                    {createForm.formState.errors.takeaway_price.message}
                  </p>
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
                <Label htmlFor="create-available">{t('available')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={createForm.watch('is_popular')}
                  onCheckedChange={(checked) => createForm.setValue('is_popular', checked)}
                  id="create-popular"
                />
                <Label htmlFor="create-popular">{tMenu('popular')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={createForm.watch('is_new')}
                  onCheckedChange={(checked) => createForm.setValue('is_new', checked)}
                  id="create-new"
                />
                <Label htmlFor="create-new">{tMenu('new')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={createForm.watch('is_bestseller')}
                  onCheckedChange={(checked) => createForm.setValue('is_bestseller', checked)}
                  id="create-bestseller"
                />
                <Label htmlFor="create-bestseller">{tMenu('bestseller')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={createForm.watch('is_spicy')}
                  onCheckedChange={(checked) => createForm.setValue('is_spicy', checked)}
                  id="create-spicy"
                />
                <Label htmlFor="create-spicy">{t('spicy')}</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-sort">{t('sortOrder')}</Label>
                <Input
                  id="create-sort"
                  type="number"
                  min={0}
                  {...createForm.register('sort_order', { valueAsNumber: true })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={createProduct.isPending || uploading}>
                {createProduct.isPending ? tCommon('processing') : t('addProduct')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleImageUpload}
      />

      <Dialog
        open={!!editProduct}
        onOpenChange={(open) => {
          if (!open) setEditProduct(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-full overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('editProduct')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEditSave)} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name-en">{t('productNameEn')} *</Label>
              <Input id="edit-name-en" {...editForm.register('name_en')} />
              {editForm.formState.errors.name_en && (
                <p className="text-destructive text-sm">
                  {editForm.formState.errors.name_en.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name-ar">{t('productNameAr')} *</Label>
              <Input id="edit-name-ar" dir="rtl" {...editForm.register('name_ar')} />
              {editForm.formState.errors.name_ar && (
                <p className="text-destructive text-sm">
                  {editForm.formState.errors.name_ar.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc-en">{t('descriptionEn')}</Label>
              <Textarea id="edit-desc-en" {...editForm.register('description_en')} rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc-ar">{t('descriptionAr')}</Label>
              <Textarea
                id="edit-desc-ar"
                dir="rtl"
                {...editForm.register('description_ar')}
                rows={2}
              />
            </div>
            <ProductImageField
              form={editForm}
              uploading={uploading}
              onUploadClick={() => openImagePicker('edit')}
              onRemove={() => removeImage(editForm)}
              t={t}
              tCommon={tCommon}
            />
            <div className="space-y-2">
              <Label htmlFor="edit-category">{t('category')} *</Label>
              <Select
                value={editForm.watch('category_id')}
                onValueChange={(val) =>
                  editForm.setValue('category_id', val ?? '', { shouldValidate: true })
                }
              >
                <SelectTrigger id="edit-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {getName(locale, c.name_en, c.name_ar)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editForm.formState.errors.category_id && (
                <p className="text-destructive text-sm">
                  {editForm.formState.errors.category_id.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-dining">
                  {t('diningPrice')} ({currency}) *
                </Label>
                <Input
                  id="edit-dining"
                  type="number"
                  min={0}
                  {...editForm.register('dining_price', { valueAsNumber: true })}
                />
                {editForm.formState.errors.dining_price && (
                  <p className="text-destructive text-sm">
                    {editForm.formState.errors.dining_price.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-takeaway">
                  {t('takeawayPrice')} ({currency}) *
                </Label>
                <Input
                  id="edit-takeaway"
                  type="number"
                  min={0}
                  {...editForm.register('takeaway_price', { valueAsNumber: true })}
                />
                {editForm.formState.errors.takeaway_price && (
                  <p className="text-destructive text-sm">
                    {editForm.formState.errors.takeaway_price.message}
                  </p>
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
                <Label htmlFor="edit-available">{t('available')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editForm.watch('is_popular')}
                  onCheckedChange={(checked) => editForm.setValue('is_popular', checked)}
                  id="edit-popular"
                />
                <Label htmlFor="edit-popular">{tMenu('popular')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editForm.watch('is_new')}
                  onCheckedChange={(checked) => editForm.setValue('is_new', checked)}
                  id="edit-new"
                />
                <Label htmlFor="edit-new">{tMenu('new')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editForm.watch('is_bestseller')}
                  onCheckedChange={(checked) => editForm.setValue('is_bestseller', checked)}
                  id="edit-bestseller"
                />
                <Label htmlFor="edit-bestseller">{tMenu('bestseller')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editForm.watch('is_spicy')}
                  onCheckedChange={(checked) => editForm.setValue('is_spicy', checked)}
                  id="edit-spicy"
                />
                <Label htmlFor="edit-spicy">{t('spicy')}</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sort">{t('sortOrder')}</Label>
                <Input
                  id="edit-sort"
                  type="number"
                  min={0}
                  {...editForm.register('sort_order', { valueAsNumber: true })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditProduct(null)}>
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={updateProduct.isPending || uploading}>
                {updateProduct.isPending ? tCommon('saving') : tCommon('saveChanges')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title={t('deleteProduct')}
        description={t('confirmDelete')}
        confirmLabel={tCommon('delete')}
        onConfirm={handleDelete}
        loading={deleteProduct.isPending}
      />
    </div>
  );
}
