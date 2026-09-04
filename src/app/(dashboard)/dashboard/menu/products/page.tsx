'use client';

import { useRef, useState, useEffect } from 'react';
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
import { useRestaurantSettings, useFeatureSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { ConfirmDialog } from '@/components/shared/feedback/ConfirmDialog';
import {
  Search,
  Upload,
  X,
  Images,
  FilterX,
  Sparkles,
  Wand2,
  ChevronDown,
  LayoutGrid,
  Table2,
} from 'lucide-react';
import { ScrollableChipRow } from '@/components/shared/ScrollableChipRow';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { Product, ProductWithGallery } from '@/types';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { formatCurrencyAmount, getRestaurantCurrency } from '@/lib/order/format-currency';
import { cn, getName } from '@/lib/utils';
import { StorageImagePickerDialog } from '@/components/dashboard/products/StorageImagePickerDialog';
import {
  AiProductImageDialog,
  requestAiProductImages,
  type AiCandidate,
  type AiProductImageMode,
} from '@/components/dashboard/products/AiProductImageDialog';
import { ProductsCommandHeader } from '@/components/dashboard/menu/ProductsCommandHeader';
import { Pagination } from '@/components/shared/Pagination';
import { usePagination } from '@/hooks/usePagination';
import {
  hasExtendedMenuLocales,
  hasProductSizeOptions,
  hasProductWeightOptions,
} from '@/i18n/config';
import { stripUnsupportedProductWriteFields } from '@/lib/catalog/keys';
import { computeWeightPrice } from '@/lib/order/weight-price';
import { WeightOptionsEditor } from '@/components/dashboard/products/WeightOptionsEditor';
import {
  ProductAdminCard,
  ProductPriceSummary,
} from '@/components/dashboard/products/ProductAdminCard';
import {
  ProductRowActions,
  productAiCategoryName,
} from '@/components/dashboard/products/ProductRowActions';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useProductAiImage } from '@/hooks/useProductAiImage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ProductForm = z.input<typeof productSchema>;

const defaultFormValues: ProductForm = {
  name_en: '',
  name_ar: '',
  name_fr: '',
  name_nl: '',
  description_en: '',
  description_ar: '',
  description_fr: '',
  description_nl: '',
  category_id: '',
  image_url: null,
  dining_price: 0,
  takeaway_price: 0,
  has_size_options: false,
  use_weight_pricing: false,
  price_per_kg: null,
  weight_options_g: '',
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
  onChooseFromStorage,
  onRemove,
  onAiImageSelect,
  categories,
  t,
  tCommon,
}: {
  form: UseFormReturn<ProductForm>;
  uploading: boolean;
  onUploadClick: () => void;
  onChooseFromStorage: () => void;
  onRemove: () => void;
  onAiImageSelect: (url: string) => void | Promise<void>;
  categories?: {
    id: string;
    name_en: string;
    name_ar: string;
    name_fr?: string | null;
    name_nl?: string | null;
  }[];
  t: (key: string, values?: Record<string, string | number>) => string;
  tCommon: (key: string) => string;
}) {
  const { locale } = useI18n();
  const { data: features } = useFeatureSettings();
  const aiProductImagesEnabled = features?.ai_product_images === true;
  const imageUrl = form.watch('image_url');
  const nameAr = form.watch('name_ar');
  const nameEn = form.watch('name_en');
  const descriptionAr = form.watch('description_ar');
  const descriptionEn = form.watch('description_en');
  const categoryId = form.watch('category_id');
  const selectedCategory = categories?.find((c) => c.id === categoryId);
  const categoryName = selectedCategory
    ? getName(
        locale,
        selectedCategory.name_en,
        selectedCategory.name_ar,
        selectedCategory.name_fr,
        selectedCategory.name_nl
      )
    : '';
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMode, setAiMode] = useState<AiProductImageMode>('generate');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiImages, setAiImages] = useState<AiCandidate[]>([]);
  const hasName = Boolean(nameAr?.trim() || nameEn?.trim());
  const hasImage = Boolean(imageUrl);
  const buttonsDisabled = uploading || aiBusy;

  const runAiGeneration = async (mode: AiProductImageMode) => {
    if (mode === 'generate' && !hasName) {
      toast.error(t('aiGenerateNeedsName'));
      return;
    }
    if (mode === 'enhance' && !hasImage) {
      toast.error(t('aiEnhanceNeedsImage'));
      return;
    }
    setAiMode(mode);
    setAiOpen(true);
    setAiBusy(true);
    setAiLoading(true);
    setAiImages([]);
    try {
      const images = await requestAiProductImages(
        mode,
        {
          name_ar: nameAr,
          name_en: nameEn,
          description_ar: descriptionAr,
          description_en: descriptionEn,
          category_name: categoryName,
          source_image_url: imageUrl,
        },
        t
      );
      if (images) setAiImages(images);
    } finally {
      setAiLoading(false);
      setAiBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <input type="hidden" {...form.register('image_url')} />
      <Label>{t('productImage')}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={onUploadClick} disabled={buttonsDisabled}>
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? tCommon('uploading') : imageUrl ? t('changeImage') : t('addImage')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onChooseFromStorage}
          disabled={buttonsDisabled}
        >
          <Images className="mr-2 h-4 w-4" />
          {t('chooseFromStorage')}
        </Button>
        {aiProductImagesEnabled && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => void runAiGeneration('generate')}
              disabled={buttonsDisabled || !hasName}
              title={!hasName ? t('aiGenerateNeedsName') : undefined}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {t('generateWithAi')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void runAiGeneration('enhance')}
              disabled={buttonsDisabled || !hasImage}
              title={!hasImage ? t('aiEnhanceNeedsImage') : undefined}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              {t('enhanceWithAi')}
            </Button>
          </>
        )}
        {imageUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            disabled={buttonsDisabled}
          >
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
      <AiProductImageDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        mode={aiMode}
        loading={aiLoading}
        images={aiImages}
        onRegenerate={() => void runAiGeneration(aiMode)}
        onUseImage={onAiImageSelect}
        t={t}
        tCommon={tCommon}
      />
    </div>
  );
}

const categoryChipClassName = (isActive: boolean) =>
  cn(
    'inline-flex min-h-[36px] shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
    isActive
      ? 'border-brand-accent bg-brand-accent text-black shadow-[0_0_16px_-4px_rgba(255,183,0,0.5)]'
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

function parseWeightOptionsG(raw: string | undefined | null): number[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,،\s]+/)
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function formatWeightOptionsG(weights: number[] | null | undefined): string {
  return weights?.length ? weights.join(', ') : '';
}

type CategoryOption = {
  id: string;
  name_en: string;
  name_ar: string;
  name_fr?: string | null;
  name_nl?: string | null;
};

type ProductsViewMode = 'cards' | 'table';

const PRODUCTS_VIEW_STORAGE_KEY = 'hettsamaka-products-view';

function getProductListLabels(
  product: ProductWithGallery,
  locale: string
): { productName: string; secondaryName: string; categoryName: string } {
  const productName = getName(
    locale,
    product.name_en,
    product.name_ar,
    product.name_fr,
    product.name_nl
  );
  const secondaryName = locale === 'ar' ? product.name_en : product.name_ar || product.name_en;
  const categoryName = product.category
    ? getName(
        locale,
        product.category.name_en,
        product.category.name_ar,
        product.category.name_fr,
        product.category.name_nl
      )
    : '—';
  return { productName, secondaryName, categoryName };
}

function getCategoryLabel(
  categoryId: string | undefined,
  categories: CategoryOption[] | undefined,
  locale: string
): string {
  if (!categoryId) return '';
  const category = categories?.find((c) => c.id === categoryId);
  if (!category) return '';
  return getName(locale, category.name_en, category.name_ar, category.name_fr, category.name_nl);
}

function ProductPriceFields({
  form,
  currency,
  idPrefix,
  t,
}: {
  form: UseFormReturn<ProductForm>;
  currency: string;
  idPrefix: 'create' | 'edit';
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const hasSizeOptions = hasProductSizeOptions && form.watch('has_size_options');
  const useWeightPricing = hasProductWeightOptions && form.watch('use_weight_pricing');
  const singlePrice = form.watch('dining_price');
  const pricePerKg = form.watch('price_per_kg');
  const weightOptionsRaw = form.watch('weight_options_g');

  useEffect(() => {
    if (!hasSizeOptions && !useWeightPricing) {
      form.setValue('takeaway_price', singlePrice, { shouldValidate: true });
    }
  }, [hasSizeOptions, useWeightPricing, singlePrice, form]);

  useEffect(() => {
    if (!useWeightPricing || pricePerKg == null) return;
    const weights = parseWeightOptionsG(weightOptionsRaw);
    if (!weights.length) return;
    const minPrice = Math.min(...weights.map((g) => computeWeightPrice(Number(pricePerKg), g)));
    form.setValue('dining_price', minPrice, { shouldValidate: true });
    form.setValue('takeaway_price', minPrice, { shouldValidate: true });
  }, [useWeightPricing, pricePerKg, weightOptionsRaw, form]);

  return (
    <div className="space-y-4">
      {hasProductWeightOptions ? (
        <div className="flex items-center gap-2">
          <Switch
            checked={useWeightPricing}
            onCheckedChange={(checked) => {
              form.setValue('use_weight_pricing', checked, { shouldDirty: true });
              if (checked) {
                form.setValue('has_size_options', false, { shouldDirty: true });
              } else {
                form.setValue('price_per_kg', null, { shouldDirty: true });
                form.setValue('weight_options_g', '', { shouldDirty: true });
              }
            }}
            id={`${idPrefix}-weight-pricing`}
          />
          <Label htmlFor={`${idPrefix}-weight-pricing`}>{t('enableWeightPricing')}</Label>
        </div>
      ) : null}

      {useWeightPricing ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-price-per-kg`}>
              {t('pricePerKg')} ({currency}) *
            </Label>
            <Input
              id={`${idPrefix}-price-per-kg`}
              type="number"
              min={0}
              step={1}
              {...form.register('price_per_kg', {
                setValueAs: (value) => {
                  if (value === '' || value == null) return null;
                  const next = Number(value);
                  return Number.isFinite(next) ? next : null;
                },
              })}
            />
            {form.formState.errors.price_per_kg && (
              <p className="text-destructive text-sm">
                {form.formState.errors.price_per_kg.message}
              </p>
            )}
          </div>
          <input type="hidden" {...form.register('weight_options_g')} />
          <WeightOptionsEditor
            value={parseWeightOptionsG(weightOptionsRaw)}
            onChange={(weights) =>
              form.setValue('weight_options_g', weights.length ? weights.join(', ') : '', {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            pricePerKg={pricePerKg ?? null}
            currency={currency}
            idPrefix={idPrefix}
            error={form.formState.errors.weight_options_g?.message}
            t={t}
          />
          <p className="text-muted-foreground text-xs">
            {t('weightPricingListHint', {
              price: formatCurrencyAmount(form.watch('dining_price'), currency, { plain: true }),
            })}
          </p>
        </div>
      ) : null}

      {hasProductSizeOptions && !useWeightPricing ? (
        <div className="flex items-center gap-2">
          <Switch
            checked={hasSizeOptions}
            onCheckedChange={(checked) =>
              form.setValue('has_size_options', checked, { shouldDirty: true })
            }
            id={`${idPrefix}-size-options`}
          />
          <Label htmlFor={`${idPrefix}-size-options`}>{t('enableSizeOptions')}</Label>
        </div>
      ) : null}

      {!useWeightPricing && hasSizeOptions ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-small`}>
              {t('smallPrice')} ({currency}) *
            </Label>
            <Input
              id={`${idPrefix}-small`}
              type="number"
              min={0}
              {...form.register('dining_price', { valueAsNumber: true })}
            />
            {form.formState.errors.dining_price && (
              <p className="text-destructive text-sm">
                {form.formState.errors.dining_price.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-large`}>
              {t('largePrice')} ({currency}) *
            </Label>
            <Input
              id={`${idPrefix}-large`}
              type="number"
              min={0}
              {...form.register('takeaway_price', { valueAsNumber: true })}
            />
            {form.formState.errors.takeaway_price && (
              <p className="text-destructive text-sm">
                {form.formState.errors.takeaway_price.message}
              </p>
            )}
          </div>
        </div>
      ) : !useWeightPricing ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-price`}>
            {t('price')} ({currency}) *
          </Label>
          <Input
            id={`${idPrefix}-price`}
            type="number"
            min={0}
            {...form.register('dining_price', { valueAsNumber: true })}
          />
          {form.formState.errors.dining_price && (
            <p className="text-destructive text-sm">{form.formState.errors.dining_price.message}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [storedView, setStoredView] = useLocalStorage<ProductsViewMode>(
    PRODUCTS_VIEW_STORAGE_KEY,
    'cards'
  );
  const viewMode: ProductsViewMode = storedView === 'table' ? 'table' : 'cards';
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [quickFilter, setQuickFilter] = useState<'all' | 'unavailable' | 'no_image'>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [storagePickerOpen, setStoragePickerOpen] = useState(false);
  const [storagePickerFormType, setStoragePickerFormType] = useState<'create' | 'edit'>('create');
  const [storagePickerSession, setStoragePickerSession] = useState(0);
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false);
  const [batchMode, setBatchMode] = useState<'missing' | 'all'>('missing');
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, name: '' });
  const [batchErrors, setBatchErrors] = useState<
    Array<{ id: string; name: string; error: string }>
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeFormRef = useRef<'create' | 'edit'>('create');
  const batchCancelRef = useRef(false);
  const t = useTranslations('products');
  const tCommon = useTranslations('common');
  const tMenu = useTranslations('menu');
  const { locale } = useI18n();

  const { data: products, isLoading, error, refetch } = useAllProducts();
  const { data: categories } = useAllCategories();
  const { data: settings } = useRestaurantSettings();
  const { data: features } = useFeatureSettings();
  const aiProductImagesEnabled = features?.ai_product_images === true;
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
    const matchesQuick =
      quickFilter === 'all' ||
      (quickFilter === 'unavailable' && !product.is_available) ||
      (quickFilter === 'no_image' && !product.image_url?.trim());
    return matchesSearch && matchesCategory && matchesQuick;
  });

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems: filteredCount,
    totalPages,
    paginatedItems: paginatedProducts,
    rangeStart,
    rangeEnd,
    pageSizeOptions,
  } = usePagination(filteredProducts, `${searchQuery}:${categoryFilter}:${quickFilter}`);

  const hasActiveFilters =
    searchQuery.length > 0 || categoryFilter !== 'all' || quickFilter !== 'all';
  const totalProducts = products?.length ?? 0;
  const availableProductsCount = products?.filter((product) => product.is_available).length ?? 0;
  const visibleCount = filteredCount;
  const activeCategory =
    categoryFilter === 'all' ? null : categories?.find((c) => c.id === categoryFilter);
  const activeCategoryLabel = activeCategory
    ? getName(
        locale,
        activeCategory.name_en,
        activeCategory.name_ar,
        activeCategory.name_fr,
        activeCategory.name_nl
      )
    : t('allCategories');

  const productsWithoutImages = products?.filter((product) => !product.image_url?.trim()) ?? [];
  const missingImageCount = productsWithoutImages.length;
  const estimatedBatchMinutes = Math.max(1, Math.ceil((missingImageCount * 45) / 60));
  const estimatedAllBatchMinutes = Math.max(1, Math.ceil((totalProducts * 45) / 60));

  const productAi = useProductAiImage({
    t,
    applyImage: async (productId, url) => {
      await updateProduct.mutateAsync({ id: productId, input: { image_url: url } });
      await refetch();
    },
  });

  const runBatchGeneration = async (mode: 'missing' | 'all') => {
    const targets = mode === 'missing' ? productsWithoutImages : (products ?? []);
    if (targets.length === 0) return;

    batchCancelRef.current = false;
    setBatchRunning(true);
    setBatchConfirmOpen(false);
    setBatchErrors([]);
    setBatchProgress({ current: 0, total: targets.length, name: '' });

    let success = 0;
    let failed = 0;

    for (let i = 0; i < targets.length; i++) {
      if (batchCancelRef.current) break;

      const product = targets[i];
      const productName = getName(
        locale,
        product.name_en,
        product.name_ar,
        product.name_fr,
        product.name_nl
      );
      setBatchProgress({ current: i + 1, total: targets.length, name: productName });

      try {
        const response = await fetch('/api/ai/product-image/auto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product.id,
            ...(mode === 'all' ? { force: true } : {}),
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          skipped?: boolean;
        };
        if (!response.ok) {
          throw new Error(payload.error || t('aiImageFailed'));
        }
        success++;
      } catch (err) {
        failed++;
        const message = err instanceof Error ? err.message : t('aiImageFailed');
        setBatchErrors((prev) => [...prev, { id: product.id, name: productName, error: message }]);
      }
    }

    setBatchRunning(false);
    await refetch();
    toast.success(t('batchCompleteSummary', { success: String(success), failed: String(failed) }));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setQuickFilter('all');
  };

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
      name_fr: product.name_fr ?? '',
      name_nl: product.name_nl ?? '',
      description_en: product.description_en ?? '',
      description_ar: product.description_ar ?? '',
      description_fr: product.description_fr ?? '',
      description_nl: product.description_nl ?? '',
      category_id: product.category_id,
      image_url: product.image_url,
      dining_price: product.dining_price,
      takeaway_price: product.takeaway_price,
      has_size_options: product.has_size_options ?? false,
      use_weight_pricing: Boolean(product.price_per_kg && product.weight_options_g?.length),
      price_per_kg: product.price_per_kg ?? null,
      weight_options_g: formatWeightOptionsG(product.weight_options_g),
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

    const formType = activeFormRef.current;
    const form = formType === 'create' ? createForm : editForm;
    const productId = formType === 'edit' ? editProduct?.id : undefined;
    setUploading(true);
    try {
      const path = generateStoragePath('products', file.name);
      const result = await uploadImage({ bucket: 'products', path, file });
      form.setValue('image_url', result.url, { shouldValidate: true, shouldDirty: true });

      if (productId) {
        await updateProduct.mutateAsync({ id: productId, input: { image_url: result.url } });
        toast.success(t('imageSaved'));
      }
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

  const openStoragePicker = (formType: 'create' | 'edit') => {
    activeFormRef.current = formType;
    setStoragePickerFormType(formType);
    setStoragePickerSession((session) => session + 1);
    setStoragePickerOpen(true);
  };

  const handleStorageImageSelect = async (url: string) => {
    const formType = activeFormRef.current;
    const form = formType === 'create' ? createForm : editForm;
    const productId = formType === 'edit' ? editProduct?.id : undefined;

    form.setValue('image_url', url, { shouldValidate: true, shouldDirty: true });

    if (productId) {
      try {
        await updateProduct.mutateAsync({ id: productId, input: { image_url: url } });
        toast.success(t('imageSaved'));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('uploadFailed'));
      }
    }
  };

  const storagePickerForm = storagePickerFormType === 'edit' ? editForm : createForm;

  const removeImage = async (form: UseFormReturn<ProductForm>) => {
    form.setValue('image_url', null, { shouldValidate: true, shouldDirty: true });
    if (editProduct) {
      try {
        await updateProduct.mutateAsync({ id: editProduct.id, input: { image_url: null } });
        toast.success(t('imageRemoved'));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('uploadFailed'));
      }
    }
  };

  const prepareProductPayload = (data: ProductForm): ProductInput => {
    const payload = { ...(data as ProductInput) };
    const weights = parseWeightOptionsG(data.weight_options_g);

    if (
      hasProductWeightOptions &&
      data.use_weight_pricing &&
      weights.length &&
      data.price_per_kg != null
    ) {
      const minPrice = Math.min(
        ...weights.map((g) => computeWeightPrice(Number(data.price_per_kg), g))
      );
      payload.dining_price = minPrice;
      payload.takeaway_price = minPrice;
      payload.price_per_kg = Number(data.price_per_kg);
      (payload as { weight_options_g?: number[] | null }).weight_options_g = weights;
    } else if (hasProductWeightOptions) {
      payload.price_per_kg = null;
      (payload as { weight_options_g?: number[] | null }).weight_options_g = null;
    }

    if (!hasProductSizeOptions || !payload.has_size_options) {
      if (!data.use_weight_pricing) {
        const price = payload.dining_price;
        payload.dining_price = price;
        payload.takeaway_price = price;
      }
      if (!data.use_weight_pricing) {
        payload.has_size_options = false;
      }
    }

    delete (payload as Record<string, unknown>).use_weight_pricing;
    return stripUnsupportedProductWriteFields(payload);
  };

  const handleCreate = async (data: ProductForm) => {
    createProduct.mutate(prepareProductPayload(data), {
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
      { id: editProduct.id, input: prepareProductPayload(data) },
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
      <ProductsCommandHeader
        totalCount={totalProducts}
        availableCount={availableProductsCount}
        onAddProduct={openCreateDialog}
        addDisabled={batchRunning}
        secondaryActions={
          aiProductImagesEnabled && totalProducts > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 shrink-0 self-start"
                    disabled={batchRunning}
                  >
                    <Sparkles className="me-2 h-4 w-4" aria-hidden="true" />
                    {t('aiImagesBulkMenu')}
                    <ChevronDown className="ms-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={missingImageCount === 0 || batchRunning}
                  onClick={() => {
                    setBatchMode('missing');
                    setBatchConfirmOpen(true);
                  }}
                >
                  {t('generateMissingImages', { count: missingImageCount })}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={batchRunning}
                  onClick={() => {
                    setBatchMode('all');
                    setBatchConfirmOpen(true);
                  }}
                >
                  {t('regenerateAllImages', { count: totalProducts })}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null
        }
      />

      <div className="bg-background/95 border-border/60 sticky top-16 z-20 -mx-4 space-y-3 border-b px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="relative">
          <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-border/60 bg-background/80 min-h-11 ps-9"
            aria-label={t('searchProducts')}
          />
        </div>

        <div className="space-y-1.5">
          <p
            id="products-quick-filter-label"
            className="text-muted-foreground text-xs font-medium uppercase tracking-wide"
          >
            {t('quickFilters')}
          </p>
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-labelledby="products-quick-filter-label"
          >
            {(
              [
                { id: 'all', label: t('quickFilterAll') },
                { id: 'unavailable', label: t('quickFilterUnavailable') },
                { id: 'no_image', label: t('quickFilterNoImage') },
              ] as const
            ).map((chip) => (
              <button
                key={chip.id}
                type="button"
                role="tab"
                aria-selected={quickFilter === chip.id}
                onClick={() => setQuickFilter(chip.id)}
                className={categoryChipClassName(quickFilter === chip.id)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <p
            id="products-category-filter-label"
            className="text-muted-foreground text-xs font-medium uppercase tracking-wide"
          >
            {t('filterByCategory')}
          </p>
          <ScrollableChipRow
            ariaLabel={t('filterByCategory')}
            scrollPrevLabel={tMenu('scrollCategoriesPrev')}
            scrollNextLabel={tMenu('scrollCategoriesNext')}
            activeChipId={categoryFilter}
            chipIdAttribute="data-category-filter-id"
            scrollClassName="pb-0.5"
            fadeFromClassName="from-background/95"
            itemCount={categories?.length ?? 0}
          >
            <button
              type="button"
              role="tab"
              aria-selected={categoryFilter === 'all'}
              data-category-filter-id="all"
              onClick={() => setCategoryFilter('all')}
              className={categoryChipClassName(categoryFilter === 'all')}
            >
              {t('allCategories')}
            </button>
            {categories?.map((category) => {
              const label = getName(
                locale,
                category.name_en,
                category.name_ar,
                category.name_fr,
                category.name_nl
              );
              const isActive = categoryFilter === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  data-category-filter-id={category.id}
                  onClick={() => setCategoryFilter(category.id)}
                  className={categoryChipClassName(isActive)}
                >
                  {label}
                </button>
              );
            })}
          </ScrollableChipRow>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {totalProducts > 0 && (
            <p className="text-muted-foreground text-xs tabular-nums">
              {hasActiveFilters
                ? t('showingFilteredCount', {
                    count: visibleCount,
                    total: totalProducts,
                    category: activeCategoryLabel,
                  })
                : t('showingCount', { count: visibleCount, total: totalProducts })}
            </p>
          )}
          <div className="ms-auto flex flex-wrap items-center gap-2">
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground min-h-11 shrink-0 px-2 text-xs md:h-8 md:min-h-8"
              >
                <FilterX className="me-1.5 h-3.5 w-3.5" aria-hidden />
                {t('clearFilters')}
              </Button>
            )}
            <div
              role="radiogroup"
              aria-label={t('viewModeLabel')}
              className="border-border/60 bg-muted/30 inline-flex rounded-lg border p-0.5"
            >
              {(
                [
                  { id: 'cards' as const, label: t('viewCards'), icon: LayoutGrid },
                  { id: 'table' as const, label: t('viewTable'), icon: Table2 },
                ] as const
              ).map((option) => {
                const isActive = viewMode === option.id;
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    aria-label={option.label}
                    title={option.label}
                    onClick={() => setStoredView(option.id)}
                    className={cn(
                      'inline-flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors',
                      isActive
                        ? 'border-brand-accent bg-brand-accent text-black shadow-[0_0_16px_-4px_rgba(255,183,0,0.5)]'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {!filteredCount ? (
        <EmptyState
          title={t('noProducts')}
          description={hasActiveFilters ? t('noProductsFiltered') : t('emptyDescription')}
          action={
            !hasActiveFilters ? { label: t('addProduct'), onClick: openCreateDialog } : undefined
          }
        />
      ) : viewMode === 'cards' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedProducts.map((product) => {
              const { productName, secondaryName, categoryName } = getProductListLabels(
                product,
                locale
              );
              return (
                <ProductAdminCard
                  key={product.id}
                  product={product}
                  productName={productName}
                  secondaryName={secondaryName}
                  categoryName={categoryName}
                  currency={currency}
                  locale={locale}
                  t={t}
                  tMenu={tMenu}
                  actions={
                    <ProductRowActions
                      product={product}
                      productName={productName}
                      density="comfortable"
                      aiEnabled={aiProductImagesEnabled}
                      batchRunning={batchRunning}
                      isAiBusy={productAi.isProductBusy(product.id)}
                      aiMode={productAi.aiMode}
                      onGenerate={() =>
                        void productAi.runGeneration(
                          product,
                          'generate',
                          productAiCategoryName(categoryName)
                        )
                      }
                      onEnhance={() =>
                        void productAi.runGeneration(
                          product,
                          'enhance',
                          productAiCategoryName(categoryName)
                        )
                      }
                      onToggleAvailability={() => handleToggleAvailability(product)}
                      onEdit={() => openEditDialog(product)}
                      onDelete={() => setDeleteId(product.id)}
                      t={t}
                      tCommon={tCommon}
                    />
                  }
                />
              );
            })}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            totalItems={filteredCount}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            className="border-border/60 bg-card/80 rounded-lg border"
          />
        </div>
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
                {paginatedProducts.map((product) => {
                  const { productName, secondaryName, categoryName } = getProductListLabels(
                    product,
                    locale
                  );

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
                        <ProductPriceSummary product={product} currency={currency} t={t} />
                      </td>
                      <td className="hidden p-3 md:table-cell">
                        <Badge variant={product.is_available ? 'default' : 'secondary'}>
                          {product.is_available ? t('available') : t('unavailable')}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <ProductRowActions
                          product={product}
                          productName={productName}
                          density="compact"
                          aiEnabled={aiProductImagesEnabled}
                          batchRunning={batchRunning}
                          isAiBusy={productAi.isProductBusy(product.id)}
                          aiMode={productAi.aiMode}
                          onGenerate={() =>
                            void productAi.runGeneration(
                              product,
                              'generate',
                              productAiCategoryName(categoryName)
                            )
                          }
                          onEnhance={() =>
                            void productAi.runGeneration(
                              product,
                              'enhance',
                              productAiCategoryName(categoryName)
                            )
                          }
                          onToggleAvailability={() => handleToggleAvailability(product)}
                          onEdit={() => openEditDialog(product)}
                          onDelete={() => setDeleteId(product.id)}
                          t={t}
                          tCommon={tCommon}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            totalItems={filteredCount}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
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
            {hasExtendedMenuLocales ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="create-name-fr">{t('productNameFr')}</Label>
                  <Input id="create-name-fr" {...createForm.register('name_fr')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-name-nl">{t('productNameNl')}</Label>
                  <Input id="create-name-nl" {...createForm.register('name_nl')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-desc-fr">{t('descriptionFr')}</Label>
                  <Textarea
                    id="create-desc-fr"
                    {...createForm.register('description_fr')}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-desc-nl">{t('descriptionNl')}</Label>
                  <Textarea
                    id="create-desc-nl"
                    {...createForm.register('description_nl')}
                    rows={2}
                  />
                </div>
              </>
            ) : null}
            <ProductImageField
              form={createForm}
              uploading={uploading}
              onUploadClick={() => openImagePicker('create')}
              onChooseFromStorage={() => openStoragePicker('create')}
              onRemove={() => removeImage(createForm)}
              onAiImageSelect={(url) => {
                activeFormRef.current = 'create';
                return handleStorageImageSelect(url);
              }}
              categories={categories}
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
                  <SelectValue placeholder={t('selectCategory')}>
                    {getCategoryLabel(createForm.watch('category_id'), categories, locale)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {getName(locale, c.name_en, c.name_ar, c.name_fr, c.name_nl)}
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
            <ProductPriceFields form={createForm} currency={currency} idPrefix="create" t={t} />
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
            {hasExtendedMenuLocales ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-name-fr">{t('productNameFr')}</Label>
                  <Input id="edit-name-fr" {...editForm.register('name_fr')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-name-nl">{t('productNameNl')}</Label>
                  <Input id="edit-name-nl" {...editForm.register('name_nl')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-desc-fr">{t('descriptionFr')}</Label>
                  <Textarea id="edit-desc-fr" {...editForm.register('description_fr')} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-desc-nl">{t('descriptionNl')}</Label>
                  <Textarea id="edit-desc-nl" {...editForm.register('description_nl')} rows={2} />
                </div>
              </>
            ) : null}
            <ProductImageField
              form={editForm}
              uploading={uploading}
              onUploadClick={() => openImagePicker('edit')}
              onChooseFromStorage={() => openStoragePicker('edit')}
              onRemove={() => removeImage(editForm)}
              onAiImageSelect={(url) => {
                activeFormRef.current = 'edit';
                return handleStorageImageSelect(url);
              }}
              categories={categories}
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
                  <SelectValue placeholder={t('selectCategory')}>
                    {getCategoryLabel(editForm.watch('category_id'), categories, locale)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {getName(locale, c.name_en, c.name_ar, c.name_fr, c.name_nl)}
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
            <ProductPriceFields form={editForm} currency={currency} idPrefix="edit" t={t} />
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
        open={batchConfirmOpen}
        onOpenChange={setBatchConfirmOpen}
        title={batchMode === 'all' ? t('batchRegenerateConfirmTitle') : t('batchConfirmTitle')}
        description={
          batchMode === 'all'
            ? t('batchRegenerateConfirmDescription', {
                count: String(totalProducts),
                minutes: String(estimatedAllBatchMinutes),
              })
            : t('batchConfirmDescription', {
                count: String(missingImageCount),
                minutes: String(estimatedBatchMinutes),
              })
        }
        confirmLabel={
          batchMode === 'all'
            ? t('regenerateAllImages', { count: totalProducts })
            : t('generateAllMissingImages')
        }
        onConfirm={() => void runBatchGeneration(batchMode)}
        loading={batchRunning}
      />

      <Dialog open={batchRunning} onOpenChange={() => undefined}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('batchRunning')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-muted-foreground text-sm">
              {t('batchProgress', {
                current: String(batchProgress.current),
                total: String(batchProgress.total),
              })}
            </p>
            {batchProgress.name && (
              <p className="text-sm font-medium">
                {t('batchCurrentProduct', { name: batchProgress.name })}
              </p>
            )}
            {batchErrors.length > 0 && (
              <div className="border-border/60 bg-muted/20 max-h-32 space-y-1 overflow-y-auto rounded-md border p-2 text-xs">
                {batchErrors.map((entry) => (
                  <p key={entry.id} className="text-destructive">
                    {entry.name}: {entry.error}
                  </p>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                batchCancelRef.current = true;
              }}
            >
              {t('batchCancel')}
            </Button>
          </DialogFooter>
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

      {aiProductImagesEnabled && (
        <AiProductImageDialog
          open={productAi.aiOpen}
          onOpenChange={productAi.setAiOpen}
          mode={productAi.aiMode}
          loading={productAi.aiLoading}
          images={productAi.aiImages}
          onRegenerate={productAi.regenerateActive}
          onUseImage={productAi.handleUseImage}
          t={t}
          tCommon={tCommon}
        />
      )}

      <StorageImagePickerDialog
        key={storagePickerSession}
        open={storagePickerOpen}
        onOpenChange={setStoragePickerOpen}
        onSelect={handleStorageImageSelect}
        selectedUrl={storagePickerForm.watch('image_url')}
        title={t('chooseFromStorageTitle')}
        emptyLabel={t('storageEmpty')}
        loadMoreLabel={t('loadMoreImages')}
        loadingLabel={tCommon('loading')}
        selectLabel={t('selectStorageImage')}
        cancelLabel={tCommon('cancel')}
      />
    </div>
  );
}
