'use client';

import { useMemo, useState } from 'react';
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
import { useAdjustStock, useStockItems, type StockItemRow } from '@/hooks/usePosInventory';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { formatCurrencyAmount, toCurrencyLocale } from '@/lib/order/format-currency';
import { getName } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

function stockQty(row: StockItemRow): number {
  return (row.stock_levels ?? []).reduce((sum, level) => sum + Number(level.qty), 0);
}

export default function InventoryPage() {
  const { locale } = useI18n();
  const t = useTranslations('inventory');
  const tCommon = useTranslations('common');
  const { data: settings } = useRestaurantSettings();
  const { data: items, isLoading, error, refetch } = useStockItems();
  const adjustStock = useAdjustStock();
  const [adjustTarget, setAdjustTarget] = useState<StockItemRow | null>(null);
  const [delta, setDelta] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name_ar: '', name_en: '', unit: 'piece' });

  const currency = settings?.currency ?? 'EGP';
  const currencyLocale = toCurrencyLocale(locale);

  const rows = useMemo(() => items ?? [], [items]);

  const handleAdjust = async () => {
    if (!adjustTarget) return;
    const qtyDelta = Number(delta);
    if (Number.isNaN(qtyDelta) || qtyDelta === 0) {
      toast.error(t('validation'));
      return;
    }
    try {
      await adjustStock.mutateAsync({
        stock_item_id: adjustTarget.id,
        qty_delta: qtyDelta,
        unit_cost: adjustTarget.avg_cost,
      });
      toast.success(t('adjusted'));
      setAdjustTarget(null);
      setDelta('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'));
    }
  };

  const handleCreate = async () => {
    if (!newItem.name_ar.trim() || !newItem.name_en.trim()) {
      toast.error(t('validation'));
      return;
    }
    const { error: insertError } = await supabase.from('stock_items').insert({
      name_ar: newItem.name_ar.trim(),
      name_en: newItem.name_en.trim(),
      unit: newItem.unit.trim() || 'piece',
    });
    if (insertError) {
      toast.error(insertError.message);
      return;
    }
    toast.success(t('created'));
    setCreateOpen(false);
    setNewItem({ name_ar: '', name_en: '', unit: 'piece' });
    void refetch();
  };

  return (
    <OstolGate>
      <div className="space-y-6">
        <PosPageHeader
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t('description')}
          action={
            <Button type="button" className="min-h-11" onClick={() => setCreateOpen(true)}>
              {t('addItem')}
            </Button>
          }
        />

        {error ? <ErrorState error={error} retry={refetch} /> : null}

        {!error && !isLoading && rows.length === 0 ? (
          <EmptyState title={t('empty')} description={t('emptyDescription')} />
        ) : null}

        {rows.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="bg-[var(--ak-gold-wash,#faf8f5)]/60 border-b text-start">
                  <th className="px-4 py-3 font-medium">{t('colName')}</th>
                  <th className="px-4 py-3 font-medium">{t('colQty')}</th>
                  <th className="px-4 py-3 font-medium">{t('colUnit')}</th>
                  <th className="px-4 py-3 font-medium">{t('colAvgCost')}</th>
                  <th className="px-4 py-3 font-medium">{tCommon('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      {getName(locale, row.name_en, row.name_ar)}
                      {stockQty(row) < 0 ? (
                        <span className="ms-2 text-xs text-[var(--ak-ember,#d97706)]">
                          {t('short')}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{stockQty(row)}</td>
                    <td className="px-4 py-3">{row.unit}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatCurrencyAmount(Number(row.avg_cost), currency, {
                        locale: currencyLocale,
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAdjustTarget(row);
                          setDelta('');
                        }}
                      >
                        {t('adjust')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <Dialog open={Boolean(adjustTarget)} onOpenChange={() => setAdjustTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('adjustTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Label htmlFor="qty-delta">{t('adjustDelta')}</Label>
              <Input
                id="qty-delta"
                type="number"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="±"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAdjustTarget(null)}>
                {tCommon('cancel')}
              </Button>
              <Button
                type="button"
                onClick={() => void handleAdjust()}
                disabled={adjustStock.isPending}
              >
                {t('adjust')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addItem')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="name-en">{t('nameEn')}</Label>
                <Input
                  id="name-en"
                  value={newItem.name_en}
                  onChange={(e) => setNewItem((s) => ({ ...s, name_en: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="name-ar">{t('nameAr')}</Label>
                <Input
                  id="name-ar"
                  value={newItem.name_ar}
                  onChange={(e) => setNewItem((s) => ({ ...s, name_ar: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="unit">{t('colUnit')}</Label>
                <Input
                  id="unit"
                  value={newItem.unit}
                  onChange={(e) => setNewItem((s) => ({ ...s, unit: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
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
