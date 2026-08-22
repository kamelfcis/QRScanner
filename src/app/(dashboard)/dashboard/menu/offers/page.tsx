'use client';

import { useMemo, useRef, useState } from 'react';
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
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { uploadImage, generateStoragePath } from '@/lib/upload';
import type { Offer, OfferInput } from '@/types';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { getRestaurantCurrency } from '@/lib/order/format-currency';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { OffersCommandHeader } from '@/components/dashboard/menu/OffersCommandHeader';
import { OffersList } from '@/components/dashboard/menu/OffersList';

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

  const totalCount = offers?.length ?? 0;
  const activeCount = useMemo(
    () => offers?.filter((offer) => offer.is_active).length ?? 0,
    [offers]
  );

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
      <OffersCommandHeader
        totalCount={totalCount}
        activeCount={activeCount}
        onAddOffer={openCreateDialog}
      />

      {!offers?.length ? (
        <EmptyState
          title={t('noOffers')}
          description={t('emptyDescription')}
          action={{ label: t('addOffer'), onClick: openCreateDialog }}
        />
      ) : (
        <OffersList
          offers={offers}
          currency={currency}
          onEdit={openEditDialog}
          onDelete={setDeleteId}
          onToggle={(offer) => toggleOffer.mutate({ id: offer.id, is_active: !offer.is_active })}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingOffer ? t('editOffer') : t('addOffer')}</DialogTitle>
            <DialogDescription>{editingOffer ? t('editOffer') : t('addOffer')}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pe-2">
            <div className="space-y-2">
              <Label htmlFor="title_en">{t('titleEn')} *</Label>
              <Input
                id="title_en"
                className="min-h-11"
                value={formData.title_en}
                onChange={(e) => setFormData((prev) => ({ ...prev, title_en: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title_ar">{t('titleAr')} *</Label>
              <Input
                id="title_ar"
                dir="rtl"
                className="min-h-11"
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
              <Label>{t('image')}</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="me-2 h-4 w-4" />
                  {uploading ? tCommon('uploading') : t('addImage')}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                {formData.image_url ? (
                  <span className="text-muted-foreground text-xs">{tCommon('upload')}</span>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('discountType')}</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={formData.discount_type === 'percentage' ? 'default' : 'outline'}
                    className="min-h-11"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, discount_type: 'percentage' }))
                    }
                  >
                    {t('discountTypePercent')}
                  </Button>
                  <Button
                    type="button"
                    variant={formData.discount_type === 'fixed' ? 'default' : 'outline'}
                    className="min-h-11"
                    onClick={() => setFormData((prev) => ({ ...prev, discount_type: 'fixed' }))}
                  >
                    {t('discountTypeFixed', { currency })}
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
                  className="min-h-11"
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start_date">{t('validFrom')}</Label>
                <Input
                  id="start_date"
                  type="date"
                  className="min-h-11"
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
                  className="min-h-11"
                  value={formData.end_date || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, end_date: e.target.value || null }))
                  }
                />
              </div>
            </div>
            <div className="flex min-h-11 items-center justify-between gap-3">
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
            <Button variant="outline" className="min-h-11" onClick={() => setDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              className="min-h-11"
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
