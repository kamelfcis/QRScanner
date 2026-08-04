'use client';

import { useState } from 'react';
import { useAllCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/useCategories';
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
import { Plus, Search } from 'lucide-react';
import { CategoryCard } from '@/features/categories/components/CategoryCard';
import { toast } from 'sonner';
import type { CategoryInput } from '@/types';

const defaultForm: CategoryInput = {
  name_en: '',
  name_ar: '',
  description_en: '',
  description_ar: '',
  sort_order: 0,
  is_visible: true,
};

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CategoryInput>(defaultForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: categories, isLoading, error, refetch } = useAllCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const filteredCategories = categories?.filter(
    (category) =>
      category.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.name_ar.includes(searchQuery)
  );

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

  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Categories</h1>
          <p className="text-muted-foreground">Manage your menu categories.</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search categories"
          />
        </div>
      </div>

      {!filteredCategories?.length ? (
        <EmptyState
          title="No categories found"
          description={searchQuery ? 'Try a different search term.' : 'Create your first category to get started.'}
          action={!searchQuery ? { label: 'Add Category', onClick: openCreateDialog } : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onDelete={() => setDeleteId(category.id)}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); resetCreateForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>Create a new menu category.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name_en">Name (English)</Label>
              <Input
                id="create-name_en"
                value={createForm.name_en}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name_en: e.target.value }))}
              />
              {formErrors.name_en && <p className="text-sm text-destructive">{formErrors.name_en}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-name_ar">Name (Arabic)</Label>
              <Input
                id="create-name_ar"
                dir="rtl"
                value={createForm.name_ar}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name_ar: e.target.value }))}
              />
              {formErrors.name_ar && <p className="text-sm text-destructive">{formErrors.name_ar}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description_en">Description (English)</Label>
              <Textarea
                id="create-description_en"
                value={createForm.description_en || ''}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, description_en: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description_ar">Description (Arabic)</Label>
              <Textarea
                id="create-description_ar"
                dir="rtl"
                value={createForm.description_ar || ''}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, description_ar: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="create-is_visible">Visible</Label>
              <Switch
                id="create-is_visible"
                checked={createForm.is_visible}
                onCheckedChange={(checked) => setCreateForm((prev) => ({ ...prev, is_visible: checked }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-sort_order">Sort Order</Label>
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
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetCreateForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createCategory.isPending}>
              {createCategory.isPending ? 'Creating...' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete Category"
        description="Are you sure? All products in this category will also be deleted. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleteCategory.isPending}
      />
    </div>
  );
}
