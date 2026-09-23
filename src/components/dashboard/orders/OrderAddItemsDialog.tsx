'use client';

import { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useStaffOrderCatalog, type StaffCatalogProduct } from '@/hooks/useStaffOrder';
import { useAppendOrderItems } from '@/hooks/useOrderEdit';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { formatCurrencyAmount } from '@/lib/order/format-currency';
import { getCartLineUnitPrice } from '@/lib/order/totals';
import { cn, getLocalizedText } from '@/lib/utils';
import { hasProductWeightOptions } from '@/i18n/config';
import type { OrderWithItems } from '@/types/database';

interface PendingLine {
  product: StaffCatalogProduct;
  quantity: number;
  sizeOption: 'small' | 'large' | null;
  weightGrams: number | null;
}

interface OrderAddItemsDialogProps {
  order: OrderWithItems;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
  currencyLocale: 'en' | 'ar' | 'fr' | 'nl';
}

function getName(locale: string, en: string, ar: string, fr: string | null, nl: string | null) {
  return getLocalizedText(locale as 'ar' | 'en' | 'fr' | 'nl', { en, ar, fr, nl });
}

export function OrderAddItemsDialog({
  order,
  open,
  onOpenChange,
  locale,
  currencyLocale,
}: OrderAddItemsDialogProps) {
  const t = useTranslations('orders');
  const tMenu = useTranslations('menu');
  const tCommon = useTranslations('common');
  const tCheckout = useTranslations('checkout');
  const { data: catalog, isLoading } = useStaffOrderCatalog();
  const appendItems = useAppendOrderItems();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingLine[]>([]);
  const [sizePick, setSizePick] = useState<StaffCatalogProduct | null>(null);

  const currency = order.currency;

  const flatProducts = useMemo(() => {
    return (catalog ?? []).flatMap((cat) => cat.products.filter((product) => product.is_available));
  }, [catalog]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return flatProducts.filter((product) => {
      if (categoryId && product.category_id !== categoryId) return false;
      if (!q) return true;
      const name = getName(
        locale,
        product.name_en,
        product.name_ar,
        product.name_fr,
        product.name_nl
      ).toLowerCase();
      return name.includes(q);
    });
  }, [flatProducts, categoryId, search, locale]);

  const reset = useCallback(() => {
    setSearch('');
    setCategoryId(null);
    setPending([]);
    setSizePick(null);
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const addProduct = (product: StaffCatalogProduct) => {
    if (product.has_size_options) {
      setSizePick(product);
      return;
    }
    setPending((prev) => {
      const existing = prev.find((line) => line.product.id === product.id);
      if (existing) {
        return prev.map((line) =>
          line.product.id === product.id
            ? { ...line, quantity: Math.min(99, line.quantity + 1) }
            : line
        );
      }
      return [...prev, { product, quantity: 1, sizeOption: null, weightGrams: null }];
    });
  };

  const confirmSize = (size: 'small' | 'large') => {
    if (!sizePick) return;
    const product = sizePick;
    setSizePick(null);
    setPending((prev) => [...prev, { product, quantity: 1, sizeOption: size, weightGrams: null }]);
  };

  const handleSubmit = async () => {
    if (pending.length === 0) return;
    try {
      await appendItems.mutateAsync({
        orderId: order.id,
        items: pending.map((line) => ({
          product_id: line.product.id,
          quantity: line.quantity,
          size_option: line.sizeOption,
          weight_grams: line.weightGrams,
          notes: null,
        })),
      });
      toast.success(t('editAddItemsSuccess'));
      handleOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      const known = [
        'already_paid',
        'order_closed',
        'shift_closed',
        'product_unavailable',
        'too_many_items',
        'empty_cart',
      ] as const;
      const code = known.find((item) => message.includes(item));
      toast.error(code ? t(`editError.${code}`) : t('editError.generic'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[min(90dvh,720px)] flex-col gap-3 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('editAddItemsTitle', { number: order.order_number })}</DialogTitle>
        </DialogHeader>

        {sizePick ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">
              {getName(
                locale,
                sizePick.name_en,
                sizePick.name_ar,
                sizePick.name_fr,
                sizePick.name_nl
              )}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" className="min-h-11" onClick={() => confirmSize('small')}>
                {t('small')}
              </Button>
              <Button type="button" className="min-h-11" onClick={() => confirmSize('large')}>
                {t('large')}
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              onClick={() => setSizePick(null)}
            >
              {t('staffBackToMenu')}
            </Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('staffSearchPlaceholder')}
                className="min-h-11 ps-9"
              />
            </div>

            <div className="flex max-h-16 flex-wrap gap-1.5 overflow-y-auto">
              <button
                type="button"
                onClick={() => setCategoryId(null)}
                className={cn(
                  'inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 text-xs font-medium',
                  categoryId === null
                    ? 'border-secondary bg-secondary text-secondary-foreground'
                    : 'border-border text-muted-foreground'
                )}
              >
                {tMenu('allCategories')}
              </button>
              {(catalog ?? []).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={cn(
                    'inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 text-xs font-medium',
                    categoryId === cat.id
                      ? 'border-secondary bg-secondary text-secondary-foreground'
                      : 'border-border text-muted-foreground'
                  )}
                >
                  {getName(locale, cat.name_en, cat.name_ar, cat.name_fr, cat.name_nl)}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border">
              {isLoading ? (
                <p className="text-muted-foreground p-4 text-center text-sm">
                  {tCommon('loading')}
                </p>
              ) : filteredProducts.length === 0 ? (
                <p className="text-muted-foreground p-4 text-center text-sm">
                  {tMenu('noProducts')}
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-2 p-2">
                  {filteredProducts.map((product) => {
                    const name = getName(
                      locale,
                      product.name_en,
                      product.name_ar,
                      product.name_fr,
                      product.name_nl
                    );
                    const unitPrice = getCartLineUnitPrice(
                      {
                        dining_price: Number(product.dining_price),
                        takeaway_price: Number(product.takeaway_price),
                        has_size_options: product.has_size_options,
                        sizeOption: product.has_size_options ? 'small' : null,
                      },
                      order.dining_mode
                    );
                    const weighted =
                      hasProductWeightOptions &&
                      product.price_per_kg != null &&
                      (product.weight_options_g?.length ?? 0) > 0;
                    return (
                      <li key={product.id}>
                        <button
                          type="button"
                          onClick={() => addProduct(product)}
                          disabled={weighted}
                          className="hover:bg-muted/60 bg-card flex min-h-20 w-full flex-col overflow-hidden rounded-lg border text-start disabled:opacity-50"
                        >
                          {product.image_url ? (
                            <div className="relative h-16 w-full overflow-hidden">
                              <Image
                                src={product.image_url}
                                alt=""
                                fill
                                sizes="120px"
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="bg-muted h-16 w-full" />
                          )}
                          <div className="px-2 py-1">
                            <p className="line-clamp-2 text-xs font-semibold">{name}</p>
                            {!weighted ? (
                              <p className="text-muted-foreground text-[10px] tabular-nums">
                                {formatCurrencyAmount(unitPrice, currency, {
                                  locale: currencyLocale,
                                })}
                              </p>
                            ) : null}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {pending.length > 0 ? (
              <div className="space-y-2 border-t pt-2">
                <p className="text-sm font-medium">
                  {t('editPendingLines', { count: pending.length })}
                </p>
                <ul className="max-h-24 space-y-1 overflow-y-auto text-sm">
                  {pending.map((line) => (
                    <li
                      key={`${line.product.id}-${line.sizeOption ?? 'std'}`}
                      className="flex justify-between gap-2"
                    >
                      <span>
                        {line.quantity}×{' '}
                        {getName(
                          locale,
                          line.product.name_en,
                          line.product.name_ar,
                          line.product.name_fr,
                          line.product.name_nl
                        )}
                      </span>
                      <button
                        type="button"
                        className="text-destructive text-xs"
                        onClick={() =>
                          setPending((prev) =>
                            prev.filter(
                              (entry) =>
                                !(
                                  entry.product.id === line.product.id &&
                                  entry.sizeOption === line.sizeOption
                                )
                            )
                          )
                        }
                      >
                        {tCommon('remove')}
                      </button>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  className="min-h-11 w-full"
                  disabled={appendItems.isPending}
                  onClick={handleSubmit}
                >
                  {appendItems.isPending ? tCheckout('placingOrder') : t('editAddItemsConfirm')}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
