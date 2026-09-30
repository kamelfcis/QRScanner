'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { OstolGate } from '@/components/dashboard/OstolGate';
import { PosPageHeader } from '@/components/dashboard/pos/PosPageHeader';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { useSupplier, useSupplierPayment } from '@/hooks/usePosInventory';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { formatCurrencyAmount, toCurrencyLocale } from '@/lib/order/format-currency';

export default function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { locale } = useI18n();
  const t = useTranslations('suppliers');
  const tCommon = useTranslations('common');
  const { data: settings } = useRestaurantSettings();
  const { data: supplier, error, refetch } = useSupplier(id);
  const paySupplier = useSupplierPayment();
  const [amount, setAmount] = useState('');

  const currency = settings?.currency ?? 'EGP';
  const currencyLocale = toCurrencyLocale(locale);

  const handlePayment = async () => {
    const value = Number(amount);
    if (!supplier || Number.isNaN(value) || value <= 0) {
      toast.error(t('validation'));
      return;
    }
    try {
      await paySupplier.mutateAsync({
        supplier_id: supplier.id,
        amount: value,
      });
      toast.success(t('paymentRecorded'));
      setAmount('');
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'));
    }
  };

  if (error) return <ErrorState error={error} retry={refetch} />;

  return (
    <OstolGate adminOnly>
      <div className="space-y-6">
        <PosPageHeader
          eyebrow={t('eyebrow')}
          title={supplier?.name ?? t('title')}
          description={t('detailDescription')}
          action={
            <Link
              href="/dashboard/suppliers"
              className="inline-flex min-h-11 items-center rounded-md border px-4 text-sm"
            >
              {tCommon('back')}
            </Link>
          }
        />

        {supplier ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground text-sm">{t('colBalance')}</p>
              <p className="font-heading mt-1 text-2xl tabular-nums">
                {formatCurrencyAmount(Number(supplier.balance), currency, {
                  locale: currencyLocale,
                })}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-muted-foreground text-sm">{t('colPhone')}</p>
              <p className="mt-1" dir="ltr">
                {supplier.phone ?? '—'}
              </p>
            </div>
          </div>
        ) : null}

        <section className="max-w-md space-y-3 rounded-xl border p-4">
          <h2 className="font-heading text-lg font-semibold">{t('recordPayment')}</h2>
          <div>
            <Label htmlFor="pay-amount">{t('paymentAmount')}</Label>
            <Input
              id="pay-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <Button
            type="button"
            className="min-h-11"
            disabled={paySupplier.isPending}
            onClick={() => void handlePayment()}
          >
            {t('recordPayment')}
          </Button>
        </section>
      </div>
    </OstolGate>
  );
}
