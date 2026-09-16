'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Image } from '@/components/shared/Image';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import type { StaffCatalogProduct } from '@/hooks/useStaffOrder';
import { formatCurrencyAmount, type CurrencyLocale } from '@/lib/order/format-currency';
import { computeWeightPrice, hasWeightOptions } from '@/lib/order/weight-price';
import { cn, getName } from '@/lib/utils';

export type StaffSizeOption = 'small' | 'large';

export interface StaffPendingProduct {
  product: StaffCatalogProduct;
  selectedSize: StaffSizeOption | null;
  selectedWeight: number | null;
}

interface StaffProductPickerPanelProps {
  pending: StaffPendingProduct;
  locale: string;
  currency: string;
  currencyLocale: CurrencyLocale;
  onSizeChange: (size: StaffSizeOption) => void;
  onWeightChange: (grams: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function StaffProductPickerPanel({
  pending,
  locale,
  currency,
  currencyLocale,
  onSizeChange,
  onWeightChange,
  onConfirm,
  onCancel,
}: StaffProductPickerPanelProps) {
  const t = useTranslations('orders');
  const tMenu = useTranslations('menu');
  const { product, selectedSize, selectedWeight } = pending;

  const needsSize = product.has_size_options;
  const needsWeight = hasWeightOptions(product);
  const canConfirm =
    (!needsSize || selectedSize != null) && (!needsWeight || selectedWeight != null);

  const name = getName(locale, product.name_en, product.name_ar, product.name_fr, product.name_nl);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="flex items-center gap-3">
          {product.image_url ? (
            <div className="relative size-12 shrink-0 overflow-hidden rounded-lg">
              <Image src={product.image_url} alt="" fill sizes="48px" className="object-cover" />
            </div>
          ) : (
            <div className="bg-muted size-12 shrink-0 rounded-lg" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-heading text-base font-semibold leading-tight">{name}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {needsWeight ? t('staffSelectWeight') : t('staffSelectSize')}
            </p>
          </div>
        </div>

        {needsSize ? (
          <div className="mt-4 space-y-2">
            <Label className="text-muted-foreground text-xs">{t('staffSelectSize')}</Label>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label={t('staffSelectSize')}>
              {(['small', 'large'] as const).map((size) => {
                const price =
                  size === 'small' ? Number(product.dining_price) : Number(product.takeaway_price);
                const selected = selectedSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => onSizeChange(size)}
                    className={cn(
                      'focus-visible:ring-ring min-h-11 touch-manipulation rounded-xl border px-3 py-2.5 text-start focus-visible:outline-none focus-visible:ring-2 motion-reduce:transition-none',
                      selected
                        ? 'border-secondary bg-secondary/10 text-secondary'
                        : 'border-border hover:bg-muted/50'
                    )}
                    aria-pressed={selected}
                  >
                    <span className="block text-sm font-medium">
                      {size === 'small' ? t('small') : t('large')}
                    </span>
                    <span className="mt-0.5 block text-sm font-semibold tabular-nums" dir="ltr">
                      {formatCurrencyAmount(price, currency, { locale: currencyLocale })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {needsWeight ? (
          <div className="mt-4 space-y-2">
            <Label className="text-muted-foreground text-xs">{t('staffSelectWeight')}</Label>
            <div
              className="grid grid-cols-3 gap-2 sm:grid-cols-4"
              role="group"
              aria-label={t('staffSelectWeight')}
            >
              {(product.weight_options_g ?? []).map((grams) => {
                const selected = selectedWeight === grams;
                const price = computeWeightPrice(Number(product.price_per_kg), grams);
                return (
                  <button
                    key={grams}
                    type="button"
                    onClick={() => onWeightChange(grams)}
                    className={cn(
                      'focus-visible:ring-ring min-h-11 touch-manipulation rounded-xl border px-2 py-2 text-center focus-visible:outline-none focus-visible:ring-2 motion-reduce:transition-none',
                      selected
                        ? 'border-secondary bg-secondary/10 text-secondary'
                        : 'border-border hover:bg-muted/50'
                    )}
                    aria-pressed={selected}
                  >
                    <span className="block text-sm font-medium">{tMenu('grams', { grams })}</span>
                    <span className="mt-0.5 block text-xs font-semibold tabular-nums" dir="ltr">
                      {formatCurrencyAmount(price, currency, { locale: currencyLocale })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="bg-card sticky bottom-0 flex gap-2 border-t p-3">
        <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={onCancel}>
          {t('staffCancelPicker')}
        </Button>
        <Button
          type="button"
          className="min-h-11 flex-1"
          disabled={!canConfirm}
          onClick={onConfirm}
        >
          {t('staffAddToTicket')}
        </Button>
      </div>
    </div>
  );
}
