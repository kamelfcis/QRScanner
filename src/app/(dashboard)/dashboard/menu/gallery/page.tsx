'use client';

import { useState, useRef } from 'react';
import { useAllGallery, useCreateGalleryItem, useUpdateGalleryItem, useDeleteGalleryItem } from '@/hooks/useGallery';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { ConfirmDialog } from '@/components/shared/feedback/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Upload, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image } from '@/components/shared/Image';
import { toast } from 'sonner';
import { uploadImage, generateStoragePath } from '@/lib/upload';
import type { Gallery, GalleryInput } from '@/types';
import { useTranslations } from '@/components/providers/RootI18nProvider';

const defaultFormData: GalleryInput = {
  image_url: '',
  caption_en: '',
  caption_ar: '',
  is_featured: false,
  sort_order: 0,
  is_visible: true,
};

export default function GalleryPage() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Gallery | null>(null);
  const [formData, setFormData] = useState<GalleryInput>(defaultFormData);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations('gallery');
  const tCommon = useTranslations('common');

  const { data: galleryItems, isLoading, error, refetch } = useAllGallery();
  const createGalleryItem = useCreateGalleryItem();
  const updateGalleryItem = useUpdateGalleryItem();
  const deleteGalleryItem = useDeleteGalleryItem();

  const openCreateDialog = () => {
    setEditingItem(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const openEditDialog = (item: Gallery) => {
    setEditingItem(item);
    setFormData({
      image_url: item.image_url,
      caption_en: item.caption_en || '',
      caption_ar: item.caption_ar || '',
      is_featured: item.is_featured,
      sort_order: item.sort_order,
      is_visible: item.is_visible,
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const path = generateStoragePath('gallery', file.name);
      const result = await uploadImage({ bucket: 'gallery', path, file });
      setFormData((prev) => ({ ...prev, image_url: result.url }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!formData.image_url) {
      toast.error('Please upload an image');
      return;
    }

    if (editingItem) {
      updateGalleryItem.mutate(
        { id: editingItem.id, input: formData },
        {
          onSuccess: () => {
            toast.success('Image updated successfully');
            setDialogOpen(false);
          },
          onError: (err) => toast.error(err.message || 'Failed to update image'),
        }
      );
    } else {
      createGalleryItem.mutate(formData, {
        onSuccess: () => {
          toast.success('Image added successfully');
          setDialogOpen(false);
        },
        onError: (err) => toast.error(err.message || 'Failed to add image'),
      });
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteGalleryItem.mutate(deleteId, {
        onSuccess: () => {
          setDeleteId(null);
          toast.success('Image deleted successfully');
        },
        onError: (err) => toast.error(err.message || 'Failed to delete image'),
      });
    }
  };

  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t('title')}</h1>
          <p className="text-muted-foreground">{t('searchPlaceholder')}</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addImage')}
        </Button>
      </div>

      {!galleryItems?.length ? (
        <EmptyState
          title={t('noImages')}
          description={t('searchPlaceholder')}
          action={{ label: t('addImage'), onClick: openCreateDialog }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {galleryItems.map((item) => (
            <Card key={item.id} className="group relative overflow-hidden">
              <div className="aspect-square w-full overflow-hidden">
                <Image
                  src={item.image_url}
                  alt={item.caption_en || 'Gallery image'}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => openEditDialog(item)}
                  aria-label={`${tCommon('edit')} ${item.caption_en ? `: ${item.caption_en}` : ''}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => setDeleteId(item.id)}
                  aria-label={`${tCommon('delete')} ${item.caption_en ? `: ${item.caption_en}` : ''}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {(item.caption_en || !item.is_visible || item.is_featured) && (
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {item.is_featured && (
                      <Badge variant="default" className="bg-amber-500 text-white text-xs">
                        <Star className="mr-1 h-3 w-3" />
                        {tCommon('active')}
                      </Badge>
                    )}
                    {!item.is_visible && (
                      <Badge variant="secondary" className="text-xs">{tCommon('hidden')}</Badge>
                    )}
                  </div>
                  {item.caption_en && (
                    <p className="mt-1 line-clamp-1 text-sm text-white">{item.caption_en}</p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? t('editImage') : t('addImage')}</DialogTitle>
            <DialogDescription>
              {editingItem ? t('editImage') : t('addImage')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Image *</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? tCommon('uploading') : t('addImage')}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                {formData.image_url && (
                  <span className="text-xs text-muted-foreground">{tCommon('upload')}</span>
                )}
              </div>
              {formData.image_url && (
                <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-md">
                  <Image
                    src={formData.image_url}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="caption_en">{t('captionEn')}</Label>
              <Input
                id="caption_en"
                value={formData.caption_en || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, caption_en: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="caption_ar">{t('captionAr')}</Label>
              <Input
                id="caption_ar"
                dir="rtl"
                value={formData.caption_ar || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, caption_ar: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort_order">{t('sortOrder')}</Label>
              <Input
                id="sort_order"
                type="number"
                min="0"
                value={formData.sort_order}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_featured">{t('isFeatured')}</Label>
              <Switch
                id="is_featured"
                checked={formData.is_featured}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_featured: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_visible">{tCommon('visible')}</Label>
              <Switch
                id="is_visible"
                checked={formData.is_visible}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_visible: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createGalleryItem.isPending || updateGalleryItem.isPending || uploading}
            >
              {editingItem ? tCommon('saveChanges') : t('addImage')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title={t('deleteImage')}
        description={t('confirmDelete')}
        confirmLabel={tCommon('delete')}
        onConfirm={handleDelete}
        loading={deleteGalleryItem.isPending}
      />
    </div>
  );
}
