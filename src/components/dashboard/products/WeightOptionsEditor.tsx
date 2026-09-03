'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { computeWeightPrice } from '@/lib/order/weight-price';
import { formatCurrencyAmount } from '@/lib/order/format-currency';

export const WEIGHT_PRESETS_G = [250, 350, 400, 450, 500, 750, 1000] as const;

const PRESET_SET = new Set<number>(WEIGHT_PRESETS_G);

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

interface WeightOptionsEditorProps {
  value: number[];
  onChange: (weights: number[]) => void;
  pricePerKg: number | null;
  currency: string;
  idPrefix: 'create' | 'edit';
  error?: string;
  t: TranslateFn;
}

function sortWeights(weights: number[]): number[] {
  return [...weights].sort((a, b) => a - b);
}

function chipClassName(selected: boolean) {
  return cn(
    'flex min-h-11 flex-col items-center justify-center rounded-lg border px-2 py-2 text-center transition-colors',
    selected
      ? 'border-primary bg-primary/10 text-foreground ring-primary/30 ring-1'
      : 'border-border/60 bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground'
  );
}

export function WeightOptionsEditor({
  value,
  onChange,
  pricePerKg,
  currency,
  idPrefix,
  error,
  t,
}: WeightOptionsEditorProps) {
  const [customInput, setCustomInput] = useState('');

  const selectedSet = new Set(value);
  const customWeights = value.filter((w) => !PRESET_SET.has(w));
  const fieldsetId = `${idPrefix}-weight-options`;

  const toggleWeight = (grams: number) => {
    onChange(
      selectedSet.has(grams) ? value.filter((w) => w !== grams) : sortWeights([...value, grams])
    );
  };

  const selectAll = () => {
    onChange(sortWeights([...new Set([...value, ...WEIGHT_PRESETS_G])]));
  };

  const clearAll = () => {
    onChange([]);
  };

  const addCustom = () => {
    const grams = Number(customInput.trim());
    if (!Number.isFinite(grams) || grams <= 0) return;
    if (selectedSet.has(grams)) {
      setCustomInput('');
      return;
    }
    onChange(sortWeights([...value, grams]));
    setCustomInput('');
  };

  const removeWeight = (grams: number) => {
    onChange(value.filter((w) => w !== grams));
  };

  const formatPrice = (grams: number) => {
    if (pricePerKg == null) return null;
    return formatCurrencyAmount(computeWeightPrice(pricePerKg, grams), currency, { plain: true });
  };

  return (
    <fieldset
      className="border-border/60 space-y-4 rounded-lg border p-4"
      aria-describedby={error ? `${fieldsetId}-error` : `${fieldsetId}-hint`}
    >
      <legend className="px-1 text-sm font-medium">{t('weightOptionsG')} *</legend>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs" id={`${fieldsetId}-hint`}>
          {t('weightOptionsHint')}
        </p>
        <p className="text-muted-foreground text-xs tabular-nums">
          {value.length > 0
            ? t('weightOptionsSelected', { count: value.length })
            : t('weightOptionsNoneSelected')}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={selectAll} className="min-h-9">
          {t('weightOptionsSelectAll')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={clearAll} className="min-h-9">
          {t('weightOptionsClearAll')}
        </Button>
      </div>

      <div>
        <p className="text-muted-foreground mb-2 text-xs font-medium">
          {t('weightOptionsPresets')}
        </p>
        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
          role="group"
          aria-label={t('weightOptionsPresets')}
        >
          {WEIGHT_PRESETS_G.map((grams) => {
            const selected = selectedSet.has(grams);
            const price = formatPrice(grams);
            return (
              <button
                key={grams}
                type="button"
                id={`${idPrefix}-weight-${grams}`}
                className={chipClassName(selected)}
                aria-pressed={selected}
                onClick={() => toggleWeight(grams)}
              >
                <span className="text-sm font-medium">{grams}g</span>
                {price != null && (
                  <span className="mt-0.5 text-xs tabular-nums opacity-80" dir="ltr">
                    {price}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {customWeights.length > 0 ? (
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium">
            {t('weightOptionsCustom')}
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('weightOptionsCustom')}>
            {customWeights.map((grams) => {
              const price = formatPrice(grams);
              return (
                <div
                  key={grams}
                  className="border-border/60 flex min-h-11 overflow-hidden rounded-lg border"
                >
                  <button
                    type="button"
                    className={cn(chipClassName(true), 'min-h-11 rounded-none border-0 ring-0')}
                    aria-pressed
                    onClick={() => toggleWeight(grams)}
                  >
                    <span className="text-sm font-medium">{grams}g</span>
                    {price != null && (
                      <span className="mt-0.5 text-xs tabular-nums opacity-80" dir="ltr">
                        {price}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    className="hover:bg-muted/80 border-border/60 text-muted-foreground hover:text-foreground border-s px-2.5 transition-colors"
                    aria-label={`${t('weightOptionsClearAll')} ${grams}g`}
                    onClick={() => removeWeight(grams)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <label htmlFor={`${idPrefix}-custom-weight`} className="text-muted-foreground text-xs">
            {t('weightOptionsCustom')}
          </label>
          <Input
            id={`${idPrefix}-custom-weight`}
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            placeholder="600"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
            className="min-h-11"
          />
        </div>
        <Button type="button" variant="secondary" onClick={addCustom} className="min-h-11 shrink-0">
          <Plus className="me-1.5 h-4 w-4" aria-hidden />
          {t('weightOptionsAdd')}
        </Button>
      </div>

      {error ? (
        <p id={`${fieldsetId}-error`} className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
