'use client';

import { useState } from 'react';
import { useAllCategories, useDeleteCategory } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { ConfirmDialog } from '@/components/shared/feedback/ConfirmDialog';
import { Plus, Search } from 'lucide-react';
import { CategoryCard } from '@/features/categories/components/CategoryCard';

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { data: categories, isLoading, error, refetch } = useAllCategories();
  const deleteCategory = useDeleteCategory();

  const filteredCategories = categories?.filter(
    (category) =>
      category.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.name_ar.includes(searchQuery)
  );

  const handleDelete = () => {
    if (deleteId) {
      deleteCategory.mutate(deleteId, {
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
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground">Manage your menu categories.</p>
        </div>
        <Button>
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
          action={!searchQuery ? { label: 'Add Category', onClick: () => {} } : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onDelete={() => setDeleteId(category.id)}
            />
          ))}
        </div>
      )}

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
