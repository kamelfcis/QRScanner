'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { OstolGate } from '@/components/dashboard/OstolGate';
import { PosPageHeader } from '@/components/dashboard/pos/PosPageHeader';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { useProductOffers } from '@/hooks/usePosInventory';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { formatCurrencyAmount, toCurrencyLocale } from '@/lib/order/format-currency';
import { formatLocaleDate } from '@/lib/dateLocale';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export default function ProductOffersPage() {
  const { locale } = useI18n();
  const t = useTranslations('productOffers');
  const tCommon = useTranslations('common');
  const { data: settings } = useRestaurantSettings();
  const { data: offers, isLoading, error, refetch } = useProductOffers();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    product_id: '',
    offer_price: '',
    starts_at: '',
    ends_at: '',
  });

  const currency = settings?.currency ?? 'EGP';
  const currencyLocale = toCurrencyLocale(locale);

  const handleCreate = async () => {
    const price = Number(form.offer_price);
    if (!form.product_id || Number.isNaN(price) || !form.starts_at || !form.ends_at) {
      toast.error(t('validation'));
      return;
    }
    const { error: insertError } = await supabase.from('product_offers').insert({
      product_id: form.product_id,
      offer_price: price,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      is_active: true,
    });
    if (insertError) {
      toast.error(insertError.message);
      return;
    }
    toast.success(t('created'));
    setOpen(false);
    void refetch();
  };

  return (
    <OstolGate adminOnly>
      <div className="space-y-6">
        <PosPageHeader
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t('description')}
          action={
            <Button type="button" className="min-h-11" onClick={() => setOpen(true)}>
              {t('addOffer')}
            </Button>
          }
        />

        {error ? <ErrorState error={error} retry={refetch} /> : null}
        {!error && !isLoading && (offers?.length ?? 0) === 0 ? (
          <EmptyState title={t('empty')} description={t('emptyDescription')} />
        ) : null}

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-[var(--ak-gold-wash,#faf8f5)]/60 border-b text-start">
                <th className="px-4 py-3 font-medium">{t('colProduct')}</th>
                <th className="px-4 py-3 font-medium">{t('colPrice')}</th>
                <th className="px-4 py-3 font-medium">{t('colWindow')}</th>
                <th className="px-4 py-3 font-medium">{tCommon('active')}</th>
              </tr>
            </thead>
            <tbody>
              {(offers ?? []).map((row) => {
                const product = (row as { products?: { name_en?: string; name_ar?: string } })
                  .products;
                const name = locale === 'ar' ? product?.name_ar : product?.name_en;
                return (
                  <tr key={row.id as string} className="border-b last:border-0">
                    <td className="px-4 py-3">{name ?? row.product_id}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatCurrencyAmount(Number(row.offer_price), currency, {
                        locale: currencyLocale,
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {formatLocaleDate(String(row.starts_at), 'd MMM', locale)} –{' '}
                      {formatLocaleDate(String(row.ends_at), 'd MMM yyyy', locale)}
                    </td>
                    <td className="px-4 py-3">{row.is_active ? tCommon('yes') : tCommon('no')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addOffer')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="product-id">{t('productId')}</Label>
                <Input
                  id="product-id"
                  value={form.product_id}
                  onChange={(e) => setForm((s) => ({ ...s, product_id: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="price">{t('colPrice')}</Label>
                <Input
                  id="price"
                  type="number"
                  value={form.offer_price}
                  onChange={(e) => setForm((s) => ({ ...s, offer_price: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="starts">{t('startsAt')}</Label>
                  <Input
                    id="starts"
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm((s) => ({ ...s, starts_at: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="ends">{t('endsAt')}</Label>
                  <Input
                    id="ends"
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) => setForm((s) => ({ ...s, ends_at: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {tCommon('cancel')}
              </Button>
              <Button type="button" onClick={() => void handleCreate()}>
                {tCommon('create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </OstolGate>
  );
}
