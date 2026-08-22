'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Copy, Pencil, Plus, Sparkles, TicketPercent, Trash2 } from 'lucide-react';
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
import { useFeatureSettings, useRestaurantSettings } from '@/hooks/useSettings';
import {
  generateCouponCode,
  useCoupons,
  useCreateCoupon,
  useDeleteCoupon,
  useUpdateCoupon,
} from '@/hooks/useCoupons';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { formatCurrencyAmount, getRestaurantCurrency } from '@/lib/order/format-currency';
import { couponSchema, type CouponInput } from '@/types/schema';
import type { Coupon } from '@/types/database';
import { cn } from '@/lib/utils';

type CouponStatus = 'active' | 'scheduled' | 'expired' | 'exhausted' | 'inactive';

const emptyForm = {
  code: '',
  discount_type: 'percentage' as CouponInput['discount_type'],
  discount_value: 10,
  min_subtotal: 0,
  max_discount: '' as number | '',
  starts_at: '',
  ends_at: '',
  max_redemptions: '' as number | '',
  per_phone_limit: 1,
  is_active: true,
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function couponStatus(coupon: Coupon): CouponStatus {
  const now = Date.now();
  if (!coupon.is_active) return 'inactive';
  if (coupon.max_redemptions != null && coupon.redeemed_count >= coupon.max_redemptions) {
    return 'exhausted';
  }
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) return 'scheduled';
  if (coupon.ends_at && new Date(coupon.ends_at).getTime() < now) return 'expired';
  return 'active';
}

export default function CouponsPage() {
  const router = useRouter();
  const t = useTranslations('coupons');
  const tCommon = useTranslations('common');
  const { data: features, isLoading: featuresLoading } = useFeatureSettings();
  const { data: settings } = useRestaurantSettings();
  const { data: coupons, isLoading, error, refetch } = useCoupons();
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();
  const currency = getRestaurantCurrency(settings?.currency);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);

  const couponsEnabled = features?.coupons === true;

  useEffect(() => {
    if (featuresLoading) return;
    if (features?.coupons !== true) {
      router.replace('/dashboard');
    }
  }, [features, featuresLoading, router]);

  const resetForm = () => {
    setForm(emptyForm);
    setFormErrors({});
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setForm({ ...emptyForm, code: generateCouponCode() });
    setDialogOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditing(coupon);
    setForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: Number(coupon.discount_value),
      min_subtotal: Number(coupon.min_subtotal),
      max_discount: coupon.max_discount == null ? '' : Number(coupon.max_discount),
      starts_at: toDatetimeLocal(coupon.starts_at),
      ends_at: toDatetimeLocal(coupon.ends_at),
      max_redemptions: coupon.max_redemptions == null ? '' : coupon.max_redemptions,
      per_phone_limit: coupon.per_phone_limit,
      is_active: coupon.is_active,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const input: CouponInput = {
      code: form.code,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_subtotal: Number(form.min_subtotal) || 0,
      max_discount: form.max_discount === '' ? null : Number(form.max_discount),
      starts_at: fromDatetimeLocal(form.starts_at),
      ends_at: fromDatetimeLocal(form.ends_at),
      max_redemptions: form.max_redemptions === '' ? null : Number(form.max_redemptions),
      per_phone_limit: Number(form.per_phone_limit) || 1,
      is_active: form.is_active,
    };

    const parsed = couponSchema.safeParse(input);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = String(issue.path[0] ?? 'code');
        next[key] = issue.message;
      });
      setFormErrors(next);
      return;
    }
    setFormErrors({});

    if (editing) {
      updateCoupon.mutate(
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
      createCoupon.mutate(parsed.data, {
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
    if (deleteTarget.redeemed_count > 0) {
      updateCoupon.mutate(
        { id: deleteTarget.id, input: { is_active: false } },
        {
          onSuccess: () => {
            toast.success(t('deactivated'));
            setDeleteTarget(null);
          },
          onError: () => toast.error(t('saveFailed')),
        }
      );
      return;
    }
    deleteCoupon.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t('deleted'));
        setDeleteTarget(null);
      },
      onError: () => toast.error(t('deleteFailed')),
    });
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(t('copied'));
    } catch {
      toast.error(t('copyFailed'));
    }
  };

  const statusTone: Record<CouponStatus, string> = useMemo(
    () => ({
      active: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
      scheduled: 'bg-sky-500/15 text-sky-800 dark:text-sky-200',
      expired: 'bg-slate-500/15 text-slate-700 dark:text-slate-200',
      exhausted: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
      inactive: 'bg-rose-500/15 text-rose-800 dark:text-rose-200',
    }),
    []
  );

  if (featuresLoading || isLoading) return <LoadingPage />;
  if (!couponsEnabled) return <LoadingPage />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button className="min-h-11" onClick={openCreate}>
          <Plus className="me-2 h-4 w-4" />
          {t('addCoupon')}
        </Button>
      </div>

      {!coupons?.length ? (
        <EmptyState
          title={t('empty')}
          description={t('emptyDescription')}
          action={{ label: t('addCoupon'), onClick: openCreate }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {coupons.map((coupon) => {
            const status = couponStatus(coupon);
            const uses =
              coupon.max_redemptions == null
                ? t('usesUnlimited', { used: coupon.redeemed_count })
                : t('usesOf', { used: coupon.redeemed_count, max: coupon.max_redemptions });
            return (
              <Card key={coupon.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs uppercase tracking-[0.16em]">
                        <TicketPercent className="h-3.5 w-3.5" />
                        {coupon.discount_type === 'percentage'
                          ? t('percentOff', { value: Number(coupon.discount_value) })
                          : t('amountOff', {
                              amount: formatCurrencyAmount(Number(coupon.discount_value), currency),
                            })}
                      </p>
                      <CardTitle className="font-heading truncate tracking-[0.14em]">
                        {coupon.code}
                      </CardTitle>
                    </div>
                    <Badge className={cn('shrink-0 border-0', statusTone[status])}>
                      {t(`status.${status}`)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground text-sm">{uses}</p>
                  <p className="text-muted-foreground text-xs">
                    {t('perPhone', { count: coupon.per_phone_limit })}
                  </p>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="min-h-11 min-w-11"
                      onClick={() => void copyCode(coupon.code)}
                      aria-label={t('copyCode')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="min-h-11 min-w-11"
                      onClick={() => openEdit(coupon)}
                      aria-label={t('editCoupon')}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive min-h-11 min-w-11"
                      onClick={() => setDeleteTarget(coupon)}
                      aria-label={t('deleteCoupon')}
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
            <DialogTitle>{editing ? t('editCoupon') : t('addCoupon')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="coupon-code">{t('code')}</Label>
              <div className="flex gap-2">
                <Input
                  id="coupon-code"
                  value={form.code}
                  className="h-11 min-h-11 uppercase tracking-[0.16em]"
                  onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => setForm({ ...form, code: generateCouponCode() })}
                >
                  <Sparkles className="me-2 h-4 w-4" />
                  {t('generate')}
                </Button>
              </div>
              {formErrors.code ? (
                <p className="text-destructive text-sm">{formErrors.code}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={form.discount_type === 'percentage' ? 'default' : 'outline'}
                className="min-h-11"
                onClick={() => setForm({ ...form, discount_type: 'percentage' })}
              >
                {t('typePercent')}
              </Button>
              <Button
                type="button"
                variant={form.discount_type === 'fixed' ? 'default' : 'outline'}
                className="min-h-11"
                onClick={() => setForm({ ...form, discount_type: 'fixed' })}
              >
                {t('typeFixed')}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="discount-value">{t('value')}</Label>
                <Input
                  id="discount-value"
                  type="number"
                  min={0}
                  className="h-11 min-h-11"
                  value={form.discount_value}
                  onChange={(event) =>
                    setForm({ ...form, discount_value: Number(event.target.value) })
                  }
                />
                {formErrors.discount_value ? (
                  <p className="text-destructive text-sm">{formErrors.discount_value}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="min-subtotal">{t('minSubtotal')}</Label>
                <Input
                  id="min-subtotal"
                  type="number"
                  min={0}
                  className="h-11 min-h-11"
                  value={form.min_subtotal}
                  onChange={(event) =>
                    setForm({ ...form, min_subtotal: Number(event.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-discount">{t('maxDiscount')}</Label>
                <Input
                  id="max-discount"
                  type="number"
                  min={0}
                  className="h-11 min-h-11"
                  value={form.max_discount}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      max_discount: event.target.value === '' ? '' : Number(event.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-redemptions">{t('maxRedemptions')}</Label>
                <Input
                  id="max-redemptions"
                  type="number"
                  min={1}
                  className="h-11 min-h-11"
                  value={form.max_redemptions}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      max_redemptions: event.target.value === '' ? '' : Number(event.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="per-phone">{t('perPhoneLimit')}</Label>
                <Input
                  id="per-phone"
                  type="number"
                  min={1}
                  className="h-11 min-h-11"
                  value={form.per_phone_limit}
                  onChange={(event) =>
                    setForm({ ...form, per_phone_limit: Number(event.target.value) })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="starts-at">{t('startsAt')}</Label>
                <Input
                  id="starts-at"
                  type="datetime-local"
                  className="h-11 min-h-11"
                  value={form.starts_at}
                  onChange={(event) => setForm({ ...form, starts_at: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ends-at">{t('endsAt')}</Label>
                <Input
                  id="ends-at"
                  type="datetime-local"
                  className="h-11 min-h-11"
                  value={form.ends_at}
                  onChange={(event) => setForm({ ...form, ends_at: event.target.value })}
                />
                {formErrors.ends_at ? (
                  <p className="text-destructive text-sm">{formErrors.ends_at}</p>
                ) : null}
              </div>
            </div>

            <div className="flex min-h-11 items-center gap-3">
              <Switch
                id="coupon-active"
                checked={form.is_active}
                onCheckedChange={(value) => setForm({ ...form, is_active: value })}
              />
              <Label htmlFor="coupon-active">{tCommon('active')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="min-h-11" onClick={() => setDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              className="min-h-11"
              onClick={handleSubmit}
              disabled={createCoupon.isPending || updateCoupon.isPending}
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
        title={
          deleteTarget && deleteTarget.redeemed_count > 0 ? t('deactivateTitle') : t('deleteCoupon')
        }
        description={
          deleteTarget && deleteTarget.redeemed_count > 0
            ? t('deactivateConfirm', { code: deleteTarget.code })
            : t('deleteConfirm', { code: deleteTarget?.code ?? '' })
        }
        onConfirm={handleDelete}
        loading={deleteCoupon.isPending || updateCoupon.isPending}
      />
    </div>
  );
}
