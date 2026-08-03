'use client';

import { useState } from 'react';
import {
  useAllTestimonials,
  useCreateTestimonial,
  useUpdateTestimonial,
  useDeleteTestimonial,
} from '@/hooks/useTestimonials';
import { Button } from '@/components/ui/button';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { ConfirmDialog } from '@/components/shared/feedback/ConfirmDialog';
import { Plus, Pencil, Trash2, Star, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { testimonialSchema, type TestimonialInput } from '@/types';
import type { Testimonial } from '@/types';

export default function TestimonialsPage() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    customer_name: string;
    customer_avatar_url: string;
    rating: number;
    review_ar: string;
    review_en: string;
    is_featured: boolean;
    is_visible: boolean;
    sort_order: number;
  }>({
    customer_name: '',
    customer_avatar_url: '',
    rating: 5,
    review_ar: '',
    review_en: '',
    is_featured: false,
    is_visible: true,
    sort_order: 0,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: testimonials, isLoading, error, refetch } = useAllTestimonials();
  const createTestimonial = useCreateTestimonial();
  const updateTestimonial = useUpdateTestimonial();
  const deleteTestimonial = useDeleteTestimonial();

  const resetForm = () => {
    setForm({
      customer_name: '',
      customer_avatar_url: '',
      rating: 5,
      review_ar: '',
      review_en: '',
      is_featured: false,
      is_visible: true,
      sort_order: 0,
    });
    setFormErrors({});
    setEditingId(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (t: Testimonial) => {
    setEditingId(t.id);
    setForm({
      customer_name: t.customer_name,
      customer_avatar_url: t.customer_avatar_url ?? '',
      rating: t.rating,
      review_ar: t.review_ar ?? '',
      review_en: t.review_en ?? '',
      is_featured: t.is_featured,
      is_visible: t.is_visible,
      sort_order: t.sort_order,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const input: TestimonialInput = {
      customer_name: form.customer_name,
      customer_avatar_url: form.customer_avatar_url || null,
      rating: form.rating,
      review_ar: form.review_ar || null,
      review_en: form.review_en || null,
      is_featured: form.is_featured,
      is_visible: form.is_visible,
      sort_order: form.sort_order,
    };

    const result = testimonialSchema.safeParse(input);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as string;
        errors[key] = issue.message;
      });
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    if (editingId) {
      updateTestimonial.mutate(
        { id: editingId, input: result.data },
        { onSuccess: () => { setDialogOpen(false); resetForm(); } }
      );
    } else {
      createTestimonial.mutate(result.data, {
        onSuccess: () => { setDialogOpen(false); resetForm(); },
      });
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteTestimonial.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  const toggleVisibility = (t: Testimonial) => {
    updateTestimonial.mutate({
      id: t.id,
      input: { is_visible: !t.is_visible },
    });
  };

  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Testimonials</h1>
          <p className="text-muted-foreground">Manage customer reviews and testimonials.</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Testimonial
        </Button>
      </div>

      {!testimonials?.length ? (
        <EmptyState
          title="No testimonials found"
          description="Add customer testimonials to build trust."
          action={{ label: 'Add Testimonial', onClick: openCreateDialog }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{t.customer_name}</CardTitle>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < t.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {t.is_featured && <Badge variant="default">Featured</Badge>}
                    <Badge variant={t.is_visible ? 'default' : 'secondary'}>
                      {t.is_visible ? 'Visible' : 'Hidden'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {t.review_en && (
                  <p className="mb-2 text-sm text-muted-foreground line-clamp-3">{t.review_en}</p>
                )}
                {t.review_ar && (
                  <p className="mb-3 text-sm text-muted-foreground line-clamp-2" dir="rtl">
                    {t.review_ar}
                  </p>
                )}
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleVisibility(t)}
                    aria-label={t.is_visible ? `Hide ${t.customer_name}` : `Show ${t.customer_name}`}
                  >
                    {t.is_visible ? (
                      <ToggleRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(t)}
                    aria-label={`Edit ${t.customer_name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleteId(t.id)}
                    aria-label={`Delete ${t.customer_name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Testimonial' : 'Add Testimonial'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="customer_name">Customer Name</Label>
              <Input
                id="customer_name"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                placeholder="Enter customer name"
              />
              {formErrors.customer_name && (
                <p className="text-sm text-destructive">{formErrors.customer_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rating">Rating</Label>
              <select
                id="rating"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {[1, 2, 3, 4, 5].map((v) => (
                  <option key={v} value={v}>
                    {v} Star{v > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="review_en">Review (English)</Label>
              <Textarea
                id="review_en"
                value={form.review_en}
                onChange={(e) => setForm({ ...form, review_en: e.target.value })}
                placeholder="Enter review in English"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="review_ar">Review (Arabic)</Label>
              <Textarea
                id="review_ar"
                value={form.review_ar}
                onChange={(e) => setForm({ ...form, review_ar: e.target.value })}
                placeholder="Enter review in Arabic"
                dir="rtl"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar_url">Avatar URL (optional)</Label>
              <Input
                id="avatar_url"
                value={form.customer_avatar_url}
                onChange={(e) => setForm({ ...form, customer_avatar_url: e.target.value })}
                placeholder="https://example.com/avatar.jpg"
              />
              {formErrors.customer_avatar_url && (
                <p className="text-sm text-destructive">{formErrors.customer_avatar_url}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                min={0}
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                  className="rounded border-input"
                />
                Featured
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_visible}
                  onChange={(e) => setForm({ ...form, is_visible: e.target.checked })}
                  className="rounded border-input"
                />
                Visible
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createTestimonial.isPending || updateTestimonial.isPending}>
              {editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete Testimonial"
        description="Are you sure you want to delete this testimonial? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleteTestimonial.isPending}
      />
    </div>
  );
}
