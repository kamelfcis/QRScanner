'use client';

import { useState, useRef } from 'react';
import {
  useAllOffers,
  useCreateOffer,
  useUpdateOffer,
  useDeleteOffer,
  useToggleOfferActive,
} from '@/hooks/useOffers';
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
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image } from '@/components/shared/Image';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { uploadImage, generateStoragePath } from '@/lib/upload';
import type { Offer, OfferInput } from '@/types';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { formatCurrencyAmount, getRestaurantCurrency } from '@/lib/order/format-currency';
import { useRestaurantSettings } from '@/hooks/useSettings';

const defaultFormData: OfferInput = {
  title_en: '',
  title_ar: '',
  description_en: '',
  description_ar: '',
  image_url: '',
  discount_type: 'percentage',
  discount_value: 0,
  start_date: null,
  end_date: null,
  is_active: true,
};

export default function OffersPage() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [formData, setFormData] = useState<OfferInput>(defaultFormData);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations('offers');
  const tCommon = useTranslations('common');

  const { data: offers, isLoading, error, refetch } = useAllOffers();
  const { data: settings } = useRestaurantSettings();
  const currency = getRestaurantCurrency(settings?.currency);
  const createOffer = useCreateOffer();
  const updateOffer = useUpdateOffer();
  const deleteOffer = useDeleteOffer();
  const toggleOffer = useToggleOfferActive();

  const openCreateDialog = () => {
    setEditingOffer(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const openEditDialog = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      title_en: offer.title_en,
      title_ar: offer.title_ar,
      description_en: offer.description_en || '',
      description_ar: offer.description_ar || '',
      image_url: offer.image_url || '',
      discount_type: offer.discount_type,
      discount_value: offer.discount_value,
      start_date: offer.start_date,
      end_date: offer.end_date,
      is_active: offer.is_active,
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const path = generateStoragePath('assets', file.name);
      const result = await uploadImage({ bucket: 'assets', path, file });
      setFormData((prev) => ({ ...prev, image_url: result.url }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!formData.title_en || !formData.title_ar) {
      toast.error('Please fill in required fields');
      return;
    }

    if (editingOffer) {
      updateOffer.mutate(
        { id: editingOffer.id, input: formData },
        {
          onSuccess: () => {
            toast.success('Offer updated successfully');
            setDialogOpen(false);
          },
          onError: (err) => toast.error(err.message || 'Failed to update offer'),
        }
      );
    } else {
      createOffer.mutate(formData, {
        onSuccess: () => {
          toast.success('Offer created successfully');
          setDialogOpen(false);
        },
        onError: (err) => toast.error(err.message || 'Failed to create offer'),
      });
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteOffer.mutate(deleteId, {
        onSuccess: () => {
          setDeleteId(null);
          toast.success('Offer deleted successfully');
        },
        onError: (err) => toast.error(err.message || 'Failed to delete offer'),
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
          {t('addOffer')}
        </Button>
      </div>

      {!offers?.length ? (
        <EmptyState
          title={t('noOffers')}
          description={t('searchPlaceholder')}
          action={{ label: t('addOffer'), onClick: openCreateDialog }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer) => (
            <Card key={offer.id} className="overflow-hidden">
              {offer.image_url && (
                <div className="aspect-video w-full overflow-hidden">
                  <Image
                    src={offer.image_url}
                    alt={offer.title_en}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{offer.title_en}</CardTitle>
                    <p className="text-muted-foreground text-sm" dir="rtl">
                      {offer.title_ar}
                    </p>
                  </div>
                  <Badge variant={offer.is_active ? 'default' : 'secondary'}>
                    {offer.is_active ? tCommon('active') : tCommon('inactive')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {offer.description_en && (
                  <p className="text-muted-foreground mb-3 line-clamp-2 text-sm">
                    {offer.description_en}
                  </p>
                )}
                <div className="mb-4 flex items-center gap-4">
                  <div>
                    <p className="text-muted-foreground text-xs">{tCommon('discount')}</p>
                    <p className="text-primary font-semibold">
                      {offer.discount_type === 'percentage'
                        ? `${offer.discount_value}%`
                        : formatCurrencyAmount(offer.discount_value, currency, { plain: true })}
                    </p>
                  </div>
                  {offer.start_date && (
                    <div>
                      <p className="text-muted-foreground text-xs">{t('validFrom')}</p>
                      <p className="text-sm">{format(new Date(offer.start_date), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                  {offer.end_date && (
                    <div>
                      <p className="text-muted-foreground text-xs">{t('validUntil')}</p>
                      <p className="text-sm">{format(new Date(offer.end_date), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      toggleOffer.mutate({ id: offer.id, is_active: !offer.is_active })
                    }
                    aria-label={
                      offer.is_active
                        ? `Deactivate ${offer.title_en}`
                        : `Activate ${offer.title_en}`
                    }
                  >
                    {offer.is_active ? (
                      <ToggleRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ToggleLeft className="text-muted-foreground h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(offer)}
                    aria-label={`${tCommon('edit')} ${offer.title_en}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive h-8 w-8"
                    onClick={() => setDeleteId(offer.id)}
                    aria-label={`${tCommon('delete')} ${offer.title_en}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingOffer ? t('editOffer') : t('addOffer')}</DialogTitle>
            <DialogDescription>{editingOffer ? t('editOffer') : t('addOffer')}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="title_en">{t('titleEn')} *</Label>
              <Input
                id="title_en"
                value={formData.title_en}
                onChange={(e) => setFormData((prev) => ({ ...prev, title_en: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title_ar">{t('titleAr')} *</Label>
              <Input
                id="title_ar"
                dir="rtl"
                value={formData.title_ar}
                onChange={(e) => setFormData((prev) => ({ ...prev, title_ar: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description_en">{t('descriptionEn')}</Label>
              <Textarea
                id="description_en"
                value={formData.description_en || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description_en: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description_ar">{t('descriptionAr')}</Label>
              <Textarea
                id="description_ar"
                dir="rtl"
                value={formData.description_ar || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description_ar: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Image</Label>
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
                  <span className="text-muted-foreground text-xs">{tCommon('upload')}</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formData.discount_type === 'percentage' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, discount_type: 'percentage' }))
                    }
                  >
                    Percentage
                  </Button>
                  <Button
                    type="button"
                    variant={formData.discount_type === 'fixed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData((prev) => ({ ...prev, discount_type: 'fixed' }))}
                  >
                    Fixed ({currency})
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount_value">{t('discountPercent')} *</Label>
                <Input
                  id="discount_value"
                  type="number"
                  min="0"
                  max={formData.discount_type === 'percentage' ? 100 : undefined}
                  value={formData.discount_value}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      discount_value: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">{t('validFrom')}</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, start_date: e.target.value || null }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">{t('validUntil')}</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, end_date: e.target.value || null }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">{t('active')}</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_active: checked }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createOffer.isPending || updateOffer.isPending || uploading}
            >
              {editingOffer ? tCommon('saveChanges') : t('addOffer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title={t('deleteOffer')}
        description={t('confirmDelete')}
        confirmLabel={tCommon('delete')}
        onConfirm={handleDelete}
        loading={deleteOffer.isPending}
      />
    </div>
  );
}
