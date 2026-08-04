'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { restaurantTableSchema } from '@/types/schema';
import type { z } from 'zod';
import { useRestaurantTables, useCreateTable, useUpdateTable, useDeleteTable } from '@/hooks/useRestaurantTables';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { ConfirmDialog } from '@/components/shared/feedback/ConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { RestaurantTable } from '@/types';
import { Plus, Table, Pencil, Trash2, Loader2 } from 'lucide-react';

export default function TablesPage() {
  const { data: tables, isLoading, error, refetch } = useRestaurantTables();
  const createMutation = useCreateTable();
  const updateMutation = useUpdateTable();
  const deleteMutation = useDeleteTable();

  const [showForm, setShowForm] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [deletingTable, setDeletingTable] = useState<RestaurantTable | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.input<typeof restaurantTableSchema>>({
    resolver: zodResolver(restaurantTableSchema),
    defaultValues: { is_active: true },
  });

  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  const openCreate = () => {
    reset({ table_number: (tables?.length || 0) + 1, is_active: true });
    setEditingTable(null);
    setShowForm(true);
  };

  const openEdit = (table: RestaurantTable) => {
    reset({
      table_number: table.table_number,
      internal_name: table.internal_name,
      description: table.description,
      is_active: table.is_active,
    });
    setEditingTable(table);
    setShowForm(true);
  };

  const onSubmit = async (data: z.input<typeof restaurantTableSchema>) => {
    const input = { ...data, is_active: data.is_active ?? true };
    if (editingTable) {
      await updateMutation.mutateAsync({ id: editingTable.id, input });
    } else {
      await createMutation.mutateAsync(input);
    }
    setShowForm(false);
    setEditingTable(null);
    reset();
  };

  const handleDelete = async () => {
    if (!deletingTable) return;
    await deleteMutation.mutateAsync(deletingTable.id);
    setDeletingTable(null);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tables</h1>
          <p className="text-muted-foreground">Manage restaurant tables for QR code association</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Table
        </Button>
      </div>

      {!tables?.length ? (
        <EmptyState
          icon={<Table className="h-12 w-12 text-muted-foreground/50" />}
          title="No tables yet"
          description="Add tables to associate with QR codes"
          action={{ label: 'Add Table', onClick: openCreate }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => (
            <Card key={table.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">
                  Table {table.table_number}
                </CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(table)} aria-label="Edit table">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeletingTable(table)} aria-label="Delete table">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {table.internal_name && (
                  <p className="text-sm font-medium">{table.internal_name}</p>
                )}
                {table.description && (
                  <p className="text-sm text-muted-foreground">{table.description}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {table.is_active ? 'Active' : 'Inactive'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTable ? 'Edit Table' : 'Add Table'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="table_number">Table Number *</Label>
              <Input
                id="table_number"
                type="number"
                min={1}
                {...register('table_number', { valueAsNumber: true })}
              />
              {errors.table_number && (
                <p className="text-sm text-destructive">{errors.table_number.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="internal_name">Internal Name</Label>
              <Input id="internal_name" {...register('internal_name')} placeholder="e.g., VIP Corner" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" {...register('description')} placeholder="Optional notes" />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={watch('is_active')}
                onCheckedChange={(val) => setValue('is_active', val)}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTable ? 'Update' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingTable}
        onOpenChange={() => setDeletingTable(null)}
        title="Delete Table"
        description={`Delete Table ${deletingTable?.table_number}? QR codes using this table will be unlinked.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
