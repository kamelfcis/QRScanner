'use client';

import { useMemo, useState } from 'react';
import {
  useAllCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/hooks/useCategories';
import { categorySchema } from '@/types/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { ConfirmDialog } from '@/components/shared/feedback/ConfirmDialog';
import { Pagination } from '@/components/shared/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { Search } from 'lucide-react';
import { CategoryCard } from '@/features/categories/components/CategoryCard';
import { toast } from 'sonner';
import type { CategoryInput } from '@/types';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { CategoriesCommandHeader } from '@/components/dashboard/menu/CategoriesCommandHeader';

const defaultForm: CategoryInput = {
  name_en: '',
  name_ar: '',
  name_fr: '',
  name_nl: '',
  description_en: '',
  description_ar: '',
  description_fr: '',
  description_nl: '',
  sort_order: 0,
  is_visible: true,
};

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CategoryInput>(defaultForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const t = useTranslations('categories');
  const tCommon = useTranslations('common');

  const { data: categories, isLoading, error, refetch } = useAllCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const filteredCategories = categories?.filter(
    (category) =>
      category.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.name_ar.includes(searchQuery)
  );

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems: filteredCount,
    totalPages,
    paginatedItems: paginatedCategories,
    rangeStart,
    rangeEnd,
    pageSizeOptions,
  } = usePagination(filteredCategories, searchQuery);

  const resetCreateForm = () => {
    setCreateForm(defaultForm);
    setFormErrors({});
  };

  const openCreateDialog = () => {
    resetCreateForm();
    setCreateOpen(true);
  };

  const handleCreate = () => {
    const result = categorySchema.safeParse(createForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0] as string] = issue.message;
        }
      });
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    createCategory.mutate(result.data, {
      onSuccess: () => {
        toast.success('Category created successfully');
        setCreateOpen(false);
        resetCreateForm();
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to create category');
      },
    });
  };

  const handleUpdate = (id: string, input: Partial<CategoryInput>) => {
    updateCategory.mutate(
      { id, input },
      {
        onSuccess: () => {
          toast.success('Category updated successfully');
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to update category');
        },
      }
    );
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteCategory.mutate(deleteId, {
        onSuccess: () => {
          toast.success('Category deleted successfully');
          setDeleteId(null);
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to delete category');
        },
      });
    }
  };

  const totalCount = categories?.length ?? 0;
  const visibleCount = useMemo(
    () => categories?.filter((category) => category.is_visible).length ?? 0,
    [categories]
  );

  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  return (
    <div className="space-y-6">
      <CategoriesCommandHeader
        totalCount={totalCount}
        visibleCount={visibleCount}
        onAddCategory={openCreateDialog}
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-h-11 ps-9"
            aria-label={t('searchCategories')}
          />
        </div>
      </div>

      {!filteredCount ? (
        <EmptyState
          title={t('noCategories')}
          description={searchQuery ? tCommon('tryAgain') : t('emptyDescription')}
          action={!searchQuery ? { label: t('addCategory'), onClick: openCreateDialog } : undefined}
        />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onDelete={() => setDeleteId(category.id)}
                onUpdate={handleUpdate}
              />
            ))}
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
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            resetCreateForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addCategory')}</DialogTitle>
            <DialogDescription>{t('updateCategoryDetails')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name_en">{t('nameEn')}</Label>
              <Input
                id="create-name_en"
                value={createForm.name_en}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name_en: e.target.value }))}
              />
              {formErrors.name_en && (
                <p className="text-destructive text-sm">{formErrors.name_en}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-name_ar">{t('nameAr')}</Label>
              <Input
                id="create-name_ar"
                dir="rtl"
                value={createForm.name_ar}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name_ar: e.target.value }))}
              />
              {formErrors.name_ar && (
                <p className="text-destructive text-sm">{formErrors.name_ar}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description_en">{t('descriptionEn')}</Label>
              <Textarea
                id="create-description_en"
                value={createForm.description_en || ''}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, description_en: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description_ar">{t('descriptionAr')}</Label>
              <Textarea
                id="create-description_ar"
                dir="rtl"
                value={createForm.description_ar || ''}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, description_ar: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-name_fr">{t('nameFr')}</Label>
              <Input
                id="create-name_fr"
                value={createForm.name_fr || ''}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name_fr: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-name_nl">{t('nameNl')}</Label>
              <Input
                id="create-name_nl"
                value={createForm.name_nl || ''}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name_nl: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description_fr">{t('descriptionFr')}</Label>
              <Textarea
                id="create-description_fr"
                value={createForm.description_fr || ''}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, description_fr: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description_nl">{t('descriptionNl')}</Label>
              <Textarea
                id="create-description_nl"
                value={createForm.description_nl || ''}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, description_nl: e.target.value }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="create-is_visible">{t('visible')}</Label>
              <Switch
                id="create-is_visible"
                checked={createForm.is_visible}
                onCheckedChange={(checked) =>
                  setCreateForm((prev) => ({ ...prev, is_visible: checked }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-sort_order">{t('sortOrder')}</Label>
              <Input
                id="create-sort_order"
                type="number"
                min="0"
                value={createForm.sort_order}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                resetCreateForm();
              }}
            >
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={createCategory.isPending}>
              {createCategory.isPending ? tCommon('processing') : t('addCategory')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title={t('deleteCategory')}
        description={t('confirmDelete')}
        confirmLabel={tCommon('delete')}
        onConfirm={handleDelete}
        loading={deleteCategory.isPending}
      />
    </div>
  );
}
