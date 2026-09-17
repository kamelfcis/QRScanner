'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MapPin, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { ConfirmDialog } from '@/components/shared/feedback/ConfirmDialog';
import { useRestaurantSettings } from '@/hooks/useSettings';
import {
  useAllDeliveryLocations,
  useCreateDeliveryLocation,
  useDeleteDeliveryLocation,
  useUpdateDeliveryLocation,
} from '@/hooks/useDeliveryLocations';
import { DeliveryLocationsCommandHeader } from '@/components/dashboard/delivery-locations/DeliveryLocationsCommandHeader';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { formatCurrencyAmount, getRestaurantCurrency } from '@/lib/order/format-currency';
import { deliveryLocationSchema, type DeliveryLocationInput } from '@/types/schema';
import type { DeliveryLocation } from '@/types/database';
import { getName, cn } from '@/lib/utils';
import { useI18n } from '@/components/providers/RootI18nProvider';

const emptyForm = {
  name_ar: '',
  name_en: '',
  name_fr: '',
  name_nl: '',
  delivery_fee: 0,
  minimum_order: 0,
  sort_order: 0,
  is_active: true,
};

export default function DeliveryLocationsPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const t = useTranslations('deliveryLocations');
  const tCommon = useTranslations('common');
  const { data: settings, isLoading: settingsLoading } = useRestaurantSettings();
  const { data: locations, isLoading, error, refetch } = useAllDeliveryLocations();
  const createLocation = useCreateDeliveryLocation();
  const updateLocation = useUpdateDeliveryLocation();
  const deleteLocation = useDeleteDeliveryLocation();
  const currency = getRestaurantCurrency(settings?.currency);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryLocation | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<DeliveryLocation | null>(null);

  const deliveryEnabled = settings?.enable_delivery === true;

  useEffect(() => {
    if (settingsLoading) return;
    if (settings?.enable_delivery !== true) {
      router.replace('/dashboard');
    }
  }, [settings, settingsLoading, router]);

  const resetForm = () => {
    setForm(emptyForm);
    setFormErrors({});
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (location: DeliveryLocation) => {
    setEditing(location);
    setForm({
      name_ar: location.name_ar,
      name_en: location.name_en,
      name_fr: location.name_fr ?? '',
      name_nl: location.name_nl ?? '',
      delivery_fee: Number(location.delivery_fee),
      minimum_order: Number(location.minimum_order ?? 0),
      sort_order: location.sort_order,
      is_active: location.is_active,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const input: DeliveryLocationInput = {
      name_ar: form.name_ar,
      name_en: form.name_en,
      name_fr: form.name_fr.trim() || null,
      name_nl: form.name_nl.trim() || null,
      delivery_fee: Number(form.delivery_fee),
      minimum_order: Number(form.minimum_order) || 0,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    };

    const parsed = deliveryLocationSchema.safeParse(input);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = String(issue.path[0] ?? 'name_en');
        next[key] = issue.message;
      });
      setFormErrors(next);
      return;
    }
    setFormErrors({});

    if (editing) {
      updateLocation.mutate(
        { id: editing.id, input: parsed.data },
        {
          onSuccess: () => {
            toast.success(t('saved'));
            setDialogOpen(false);
            resetForm();
          },
          onError: () => toast.error(t('saveFailed')),
        }
      );
    } else {
      createLocation.mutate(parsed.data, {
        onSuccess: () => {
          toast.success(t('saved'));
          setDialogOpen(false);
          resetForm();
        },
        onError: () => toast.error(t('saveFailed')),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteLocation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t('deleted'));
        setDeleteTarget(null);
      },
      onError: () => toast.error(t('deleteFailed')),
    });
  };

  const totalCount = locations?.length ?? 0;
  const activeCount = useMemo(
    () => (locations ?? []).filter((location) => location.is_active).length,
    [locations]
  );

  if (settingsLoading || isLoading) return <LoadingPage />;
  if (!deliveryEnabled) return <LoadingPage />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  return (
    <div className="space-y-6">
      <DeliveryLocationsCommandHeader
        totalCount={totalCount}
        activeCount={activeCount}
        onAddLocation={openCreate}
      />

      {!locations?.length ? (
        <EmptyState
          title={t('empty')}
          description={t('emptyDescription')}
          action={{ label: t('createFirst'), onClick: openCreate }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {locations.map((location) => {
            const displayName = getName(
              locale,
              location.name_en,
              location.name_ar,
              location.name_fr,
              location.name_nl
            );
            return (
              <Card key={location.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs uppercase tracking-[0.16em]">
                        <MapPin className="h-3.5 w-3.5" />
                        {formatCurrencyAmount(Number(location.delivery_fee), currency)}
                        {Number(location.minimum_order ?? 0) > 0 ? (
                          <span className="normal-case tracking-normal">
                            ·{' '}
                            {t('minimumOrderShort', {
                              amount: formatCurrencyAmount(
                                Number(location.minimum_order),
                                currency
                              ),
                            })}
                          </span>
                        ) : null}
                      </p>
                      <CardTitle className="font-heading truncate tracking-[0.08em]">
                        {displayName}
                      </CardTitle>
                    </div>
                    <Badge
                      className={cn(
                        'shrink-0 border-0',
                        location.is_active
                          ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                          : 'bg-slate-500/15 text-slate-700 dark:text-slate-200'
                      )}
                    >
                      {location.is_active ? tCommon('active') : tCommon('inactive')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground text-xs">
                    {t('sortOrder', { order: location.sort_order })}
                  </p>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="min-h-11 min-w-11"
                      onClick={() => openEdit(location)}
                      aria-label={t('editLocation')}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive min-h-11 min-w-11"
                      onClick={() => setDeleteTarget(location)}
                      aria-label={t('deleteLocation')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t('editLocation') : t('addLocation')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name-ar">{t('nameAr')}</Label>
                <Input
                  id="name-ar"
                  value={form.name_ar}
                  className="h-11 min-h-11"
                  onChange={(event) => setForm({ ...form, name_ar: event.target.value })}
                />
                {formErrors.name_ar ? (
                  <p className="text-destructive text-sm">{formErrors.name_ar}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name-en">{t('nameEn')}</Label>
                <Input
                  id="name-en"
                  value={form.name_en}
                  className="h-11 min-h-11"
                  onChange={(event) => setForm({ ...form, name_en: event.target.value })}
                />
                {formErrors.name_en ? (
                  <p className="text-destructive text-sm">{formErrors.name_en}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name-fr">{t('nameFr')}</Label>
                <Input
                  id="name-fr"
                  value={form.name_fr}
                  className="h-11 min-h-11"
                  onChange={(event) => setForm({ ...form, name_fr: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name-nl">{t('nameNl')}</Label>
                <Input
                  id="name-nl"
                  value={form.name_nl}
                  className="h-11 min-h-11"
                  onChange={(event) => setForm({ ...form, name_nl: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery-fee">{t('deliveryFee')}</Label>
                <Input
                  id="delivery-fee"
                  type="number"
                  min={0}
                  step="0.01"
                  className="h-11 min-h-11"
                  value={form.delivery_fee}
                  onChange={(event) =>
                    setForm({ ...form, delivery_fee: Number(event.target.value) })
                  }
                />
                {formErrors.delivery_fee ? (
                  <p className="text-destructive text-sm">{formErrors.delivery_fee}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimum-order">{t('minimumOrder')}</Label>
                <Input
                  id="minimum-order"
                  type="number"
                  min={0}
                  step="0.01"
                  className="h-11 min-h-11"
                  value={form.minimum_order}
                  onChange={(event) =>
                    setForm({ ...form, minimum_order: Number(event.target.value) })
                  }
                />
                <p className="text-muted-foreground text-xs">{t('minimumOrderHint')}</p>
                {formErrors.minimum_order ? (
                  <p className="text-destructive text-sm">{formErrors.minimum_order}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort-order">{t('sortOrderLabel')}</Label>
                <Input
                  id="sort-order"
                  type="number"
                  min={0}
                  className="h-11 min-h-11"
                  value={form.sort_order}
                  onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })}
                />
              </div>
            </div>

            <div className="flex min-h-11 items-center gap-3">
              <Switch
                id="location-active"
                checked={form.is_active}
                onCheckedChange={(value) => setForm({ ...form, is_active: value })}
              />
              <Label htmlFor="location-active">{tCommon('active')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="min-h-11" onClick={() => setDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              className="min-h-11"
              onClick={handleSubmit}
              disabled={createLocation.isPending || updateLocation.isPending}
            >
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t('deleteLocation')}
        description={t('deleteConfirm', {
          name: deleteTarget
            ? getName(
                locale,
                deleteTarget.name_en,
                deleteTarget.name_ar,
                deleteTarget.name_fr,
                deleteTarget.name_nl
              )
            : '',
        })}
        onConfirm={handleDelete}
        loading={deleteLocation.isPending}
      />
    </div>
  );
}
