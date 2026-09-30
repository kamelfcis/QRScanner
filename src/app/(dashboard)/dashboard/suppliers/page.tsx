'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import { useSuppliers } from '@/hooks/usePosInventory';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { formatCurrencyAmount, toCurrencyLocale } from '@/lib/order/format-currency';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export default function SuppliersPage() {
  const { locale } = useI18n();
  const t = useTranslations('suppliers');
  const tCommon = useTranslations('common');
  const { data: settings } = useRestaurantSettings();
  const { data: suppliers, isLoading, error, refetch } = useSuppliers();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });

  const currency = settings?.currency ?? 'EGP';
  const currencyLocale = toCurrencyLocale(locale);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error(t('validation'));
      return;
    }
    const { error: insertError } = await supabase.from('suppliers').insert({
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
    });
    if (insertError) {
      toast.error(insertError.message);
      return;
    }
    toast.success(t('created'));
    setOpen(false);
    setForm({ name: '', phone: '', notes: '' });
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
              {t('addSupplier')}
            </Button>
          }
        />

        {error ? <ErrorState error={error} retry={refetch} /> : null}
        {!error && !isLoading && (suppliers?.length ?? 0) === 0 ? (
          <EmptyState title={t('empty')} description={t('emptyDescription')} />
        ) : null}

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-[var(--ak-gold-wash,#faf8f5)]/60 border-b text-start">
                <th className="px-4 py-3 font-medium">{t('colName')}</th>
                <th className="px-4 py-3 font-medium">{t('colPhone')}</th>
                <th className="px-4 py-3 font-medium">{t('colBalance')}</th>
                <th className="px-4 py-3 font-medium">{tCommon('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {(suppliers ?? []).map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3" dir="ltr">
                    {row.phone ?? '—'}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatCurrencyAmount(Number(row.balance), currency, {
                      locale: currencyLocale,
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/suppliers/${row.id}`}
                      className="text-[var(--ak-ember,#d97706)] underline-offset-2 hover:underline"
                    >
                      {t('view')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addSupplier')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="name">{t('colName')}</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="phone">{t('colPhone')}</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="notes">{t('notes')}</Label>
                <Input
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                />
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
