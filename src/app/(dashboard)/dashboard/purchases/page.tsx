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
import {
  usePostPurchase,
  usePurchaseInvoices,
  useStockItems,
  useSuppliers,
} from '@/hooks/usePosInventory';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { formatCurrencyAmount, toCurrencyLocale } from '@/lib/order/format-currency';
import { formatLocaleDate } from '@/lib/dateLocale';

export default function PurchasesPage() {
  const { locale } = useI18n();
  const t = useTranslations('purchases');
  const tCommon = useTranslations('common');
  const { data: settings } = useRestaurantSettings();
  const { data: invoices, isLoading, error, refetch } = usePurchaseInvoices();
  const { data: suppliers } = useSuppliers();
  const { data: stockItems } = useStockItems();
  const postPurchase = usePostPurchase();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    supplier_id: '',
    invoice_number: '',
    stock_item_id: '',
    qty: '',
    unit_cost: '',
  });

  const currency = settings?.currency ?? 'EGP';
  const currencyLocale = toCurrencyLocale(locale);

  const handlePost = async () => {
    const qty = Number(form.qty);
    const unitCost = Number(form.unit_cost);
    if (
      !form.supplier_id ||
      !form.stock_item_id ||
      Number.isNaN(qty) ||
      qty <= 0 ||
      Number.isNaN(unitCost)
    ) {
      toast.error(t('validation'));
      return;
    }
    try {
      await postPurchase.mutateAsync({
        supplier_id: form.supplier_id,
        invoice_number: form.invoice_number || null,
        lines: [{ stock_item_id: form.stock_item_id, qty, unit_cost: unitCost }],
      });
      toast.success(t('posted'));
      setOpen(false);
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'));
    }
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
              {t('postInvoice')}
            </Button>
          }
        />

        {error ? <ErrorState error={error} retry={refetch} /> : null}
        {!error && !isLoading && (invoices?.length ?? 0) === 0 ? (
          <EmptyState title={t('empty')} description={t('emptyDescription')} />
        ) : null}

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-[var(--ak-gold-wash,#faf8f5)]/60 border-b text-start">
                <th className="px-4 py-3 font-medium">{t('colDate')}</th>
                <th className="px-4 py-3 font-medium">{t('colSupplier')}</th>
                <th className="px-4 py-3 font-medium">{t('colTotal')}</th>
                <th className="px-4 py-3 font-medium">{t('colPaid')}</th>
              </tr>
            </thead>
            <tbody>
              {(invoices ?? []).map((row) => {
                const supplierName =
                  (row as { suppliers?: { name?: string } }).suppliers?.name ?? '—';
                return (
                  <tr key={row.id as string} className="border-b last:border-0">
                    <td className="px-4 py-3 tabular-nums">
                      {formatLocaleDate(String(row.invoice_date), 'd MMM yyyy', locale)}
                    </td>
                    <td className="px-4 py-3">{supplierName}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatCurrencyAmount(Number(row.total), currency, {
                        locale: currencyLocale,
                      })}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatCurrencyAmount(Number(row.paid_amount), currency, {
                        locale: currencyLocale,
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('postInvoice')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="supplier">{t('colSupplier')}</Label>
                <select
                  id="supplier"
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                  value={form.supplier_id}
                  onChange={(e) => setForm((s) => ({ ...s, supplier_id: e.target.value }))}
                >
                  <option value="">{t('selectSupplier')}</option>
                  {(suppliers ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="inv-num">{t('invoiceNumber')}</Label>
                <Input
                  id="inv-num"
                  value={form.invoice_number}
                  onChange={(e) => setForm((s) => ({ ...s, invoice_number: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="stock">{t('stockItem')}</Label>
                <select
                  id="stock"
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                  value={form.stock_item_id}
                  onChange={(e) => setForm((s) => ({ ...s, stock_item_id: e.target.value }))}
                >
                  <option value="">{t('selectStock')}</option>
                  {(stockItems ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name_en}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="qty">{t('qty')}</Label>
                  <Input
                    id="qty"
                    type="number"
                    value={form.qty}
                    onChange={(e) => setForm((s) => ({ ...s, qty: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="cost">{t('unitCost')}</Label>
                  <Input
                    id="cost"
                    type="number"
                    value={form.unit_cost}
                    onChange={(e) => setForm((s) => ({ ...s, unit_cost: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {tCommon('cancel')}
              </Button>
              <Button
                type="button"
                disabled={postPurchase.isPending}
                onClick={() => void handlePost()}
              >
                {t('postInvoice')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </OstolGate>
  );
}
