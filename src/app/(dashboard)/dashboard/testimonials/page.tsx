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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { testimonialSchema, type TestimonialInput } from '@/types';
import type { Testimonial } from '@/types';
import { useTranslations } from '@/components/providers/RootI18nProvider';

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

  const t = useTranslations('testimonials');
  const tCommon = useTranslations('common');

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

  const openEditDialog = (testimonial: Testimonial) => {
    setEditingId(testimonial.id);
    setForm({
      customer_name: testimonial.customer_name,
      customer_avatar_url: testimonial.customer_avatar_url ?? '',
      rating: testimonial.rating,
      review_ar: testimonial.review_ar ?? '',
      review_en: testimonial.review_en ?? '',
      is_featured: testimonial.is_featured,
      is_visible: testimonial.is_visible,
      sort_order: testimonial.sort_order,
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

  const toggleVisibility = (testimonial: Testimonial) => {
    updateTestimonial.mutate({
      id: testimonial.id,
      input: { is_visible: !testimonial.is_visible },
    });
  };

  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addTestimonial')}
        </Button>
      </div>

      {!testimonials?.length ? (
        <EmptyState
          title={t('noTestimonials')}
          description={t('noTestimonialsDescription')}
          action={{ label: t('addTestimonial'), onClick: openCreateDialog }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{testimonial.customer_name}</CardTitle>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < testimonial.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {testimonial.is_featured && <Badge variant="default">{t('featured')}</Badge>}
                    <Badge variant={testimonial.is_visible ? 'default' : 'secondary'}>
                      {testimonial.is_visible ? tCommon('visible') : tCommon('hidden')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {testimonial.review_en && (
                  <p className="mb-2 text-sm text-muted-foreground line-clamp-3">{testimonial.review_en}</p>
                )}
                {testimonial.review_ar && (
                  <p className="mb-3 text-sm text-muted-foreground line-clamp-2" dir="rtl">
                    {testimonial.review_ar}
                  </p>
                )}
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleVisibility(testimonial)}
                    aria-label={testimonial.is_visible ? `Hide ${testimonial.customer_name}` : `Show ${testimonial.customer_name}`}
                  >
                    {testimonial.is_visible ? (
                      <ToggleRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(testimonial)}
                    aria-label={`Edit ${testimonial.customer_name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleteId(testimonial.id)}
                    aria-label={`Delete ${testimonial.customer_name}`}
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
            <DialogTitle>{editingId ? t('editTestimonial') : t('addTestimonial')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="customer_name">{t('customerName')}</Label>
              <Input
                id="customer_name"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                placeholder={t('customerNamePlaceholder')}
              />
              {formErrors.customer_name && (
                <p className="text-sm text-destructive">{formErrors.customer_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rating">{t('rating')}</Label>
              <Select
                value={String(form.rating)}
                onValueChange={(val) => setForm({ ...form, rating: Number(val) })}
              >
                <SelectTrigger id="rating">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((v) => (
                    <SelectItem key={v} value={String(v)}>
                      {v} {v > 1 ? tCommon('stars') : tCommon('star')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="review_en">{t('reviewEn')}</Label>
              <Textarea
                id="review_en"
                value={form.review_en}
                onChange={(e) => setForm({ ...form, review_en: e.target.value })}
                placeholder={t('reviewEnPlaceholder')}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="review_ar">{t('reviewAr')}</Label>
              <Textarea
                id="review_ar"
                value={form.review_ar}
                onChange={(e) => setForm({ ...form, review_ar: e.target.value })}
                placeholder={t('reviewArPlaceholder')}
                dir="rtl"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar_url">{t('avatarUrl')}</Label>
              <Input
                id="avatar_url"
                value={form.customer_avatar_url}
                onChange={(e) => setForm({ ...form, customer_avatar_url: e.target.value })}
                placeholder={t('avatarUrlPlaceholder')}
              />
              {formErrors.customer_avatar_url && (
                <p className="text-sm text-destructive">{formErrors.customer_avatar_url}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort_order">{t('sortOrder')}</Label>
              <Input
                id="sort_order"
                type="number"
                min={0}
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_featured"
                  checked={form.is_featured}
                  onCheckedChange={(val) => setForm({ ...form, is_featured: val })}
                />
                <Label htmlFor="is_featured">{t('featured')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_visible"
                  checked={form.is_visible}
                  onCheckedChange={(val) => setForm({ ...form, is_visible: val })}
                />
                <Label htmlFor="is_visible">{tCommon('visible')}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={createTestimonial.isPending || updateTestimonial.isPending}>
              {editingId ? tCommon('update') : tCommon('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title={t('deleteTestimonial')}
        description={t('confirmDelete')}
        confirmLabel={tCommon('delete')}
        onConfirm={handleDelete}
        loading={deleteTestimonial.isPending}
      />
    </div>
  );
}
