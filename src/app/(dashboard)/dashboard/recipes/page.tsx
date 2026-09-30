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
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { useRecipes, useStockItems } from '@/hooks/usePosInventory';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export default function RecipesPage() {
  const t = useTranslations('recipes');
  const tCommon = useTranslations('common');
  const { data: recipes, isLoading, error, refetch } = useRecipes();
  const { data: stockItems } = useStockItems();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    product_id: '',
    yield_qty: '1',
    stock_item_id: '',
    line_qty: '',
  });

  const handleCreate = async () => {
    if (!form.product_id || !form.stock_item_id || !form.line_qty) {
      toast.error(t('validation'));
      return;
    }
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .upsert(
        {
          product_id: form.product_id,
          yield_qty: Number(form.yield_qty) || 1,
        },
        { onConflict: 'product_id' }
      )
      .select('id')
      .single();

    if (recipeError || !recipe) {
      toast.error(recipeError?.message ?? tCommon('error'));
      return;
    }

    const { error: lineError } = await supabase.from('recipe_lines').insert({
      recipe_id: recipe.id,
      stock_item_id: form.stock_item_id,
      qty: Number(form.line_qty),
    });

    if (lineError) {
      toast.error(lineError.message);
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
              {t('addRecipe')}
            </Button>
          }
        />

        {error ? <ErrorState error={error} retry={refetch} /> : null}
        {!error && !isLoading && (recipes?.length ?? 0) === 0 ? (
          <EmptyState title={t('empty')} description={t('emptyDescription')} />
        ) : null}

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-[var(--ak-gold-wash,#faf8f5)]/60 border-b text-start">
                <th className="px-4 py-3 font-medium">{t('colProduct')}</th>
                <th className="px-4 py-3 font-medium">{t('colYield')}</th>
                <th className="px-4 py-3 font-medium">{t('colLines')}</th>
              </tr>
            </thead>
            <tbody>
              {(recipes ?? []).map((recipe) => (
                <tr key={recipe.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{recipe.product_id.slice(0, 8)}…</td>
                  <td className="px-4 py-3 tabular-nums">{recipe.yield_qty}</td>
                  <td className="px-4 py-3 tabular-nums">{recipe.recipe_lines?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-muted-foreground text-sm">
          <Link href="/dashboard/menu" className="underline-offset-2 hover:underline">
            {t('menuLink')}
          </Link>
        </p>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addRecipe')}</DialogTitle>
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
                <Label htmlFor="yield">{t('colYield')}</Label>
                <Input
                  id="yield"
                  type="number"
                  value={form.yield_qty}
                  onChange={(e) => setForm((s) => ({ ...s, yield_qty: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="stock-item">{t('ingredient')}</Label>
                <select
                  id="stock-item"
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                  value={form.stock_item_id}
                  onChange={(e) => setForm((s) => ({ ...s, stock_item_id: e.target.value }))}
                >
                  <option value="">{t('selectIngredient')}</option>
                  {(stockItems ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name_en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="line-qty">{t('lineQty')}</Label>
                <Input
                  id="line-qty"
                  type="number"
                  value={form.line_qty}
                  onChange={(e) => setForm((s) => ({ ...s, line_qty: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {tCommon('cancel')}
              </Button>
              <Button type="button" onClick={() => void handleCreate()}>
                {tCommon('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </OstolGate>
  );
}
