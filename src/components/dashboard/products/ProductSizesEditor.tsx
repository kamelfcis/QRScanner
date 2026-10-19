'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  PRESET_SIZE_CODES,
  isPresetSizeCode,
  type EcommerceProductSize,
} from '@/lib/catalog/ecommerce-sizes';
import { cn } from '@/lib/utils';

interface ProductSizesEditorProps {
  rows: EcommerceProductSize[];
  onChange: (rows: EcommerceProductSize[]) => void;
  currency: string;
  t: (key: string, values?: Record<string, string | number>) => string;
  idPrefix: string;
}

export function ProductSizesEditor({
  rows,
  onChange,
  currency,
  t,
  idPrefix,
}: ProductSizesEditorProps) {
  const customRow = rows.find((row) => !isPresetSizeCode(row.code));

  const updateRow = (code: string, patch: Partial<EcommerceProductSize>) => {
    onChange(rows.map((row) => (row.code === code ? { ...row, ...patch } : row)));
  };

  const addCustomSize = () => {
    if (customRow) return;
    onChange([
      ...rows,
      {
        sort_order: 4,
        code: 'custom',
        label_en: '',
        label_ar: '',
        price: 0,
        is_enabled: false,
        is_sold_out: false,
      },
    ]);
  };

  const removeCustomSize = () => {
    onChange(rows.filter((row) => isPresetSizeCode(row.code)));
  };

  const renderRow = (row: EcommerceProductSize, preset: boolean) => {
    const code = row.code;
    const title = preset ? t(`sizePreset.${code}`) : t('sizeCustom');

    return (
      <div
        key={code}
        className={cn(
          'space-y-3 rounded-lg border p-3',
          row.is_enabled ? 'border-border/80' : 'border-border/40 opacity-90'
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">{title}</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id={`${idPrefix}-${code}-enabled`}
                checked={row.is_enabled}
                onCheckedChange={(checked) => updateRow(code, { is_enabled: checked })}
              />
              <Label htmlFor={`${idPrefix}-${code}-enabled`} className="text-xs">
                {t('sizeEnabled')}
              </Label>
            </div>
            {row.is_enabled ? (
              <div className="flex items-center gap-2">
                <Switch
                  id={`${idPrefix}-${code}-sold-out`}
                  checked={row.is_sold_out}
                  onCheckedChange={(checked) => updateRow(code, { is_sold_out: checked })}
                />
                <Label htmlFor={`${idPrefix}-${code}-sold-out`} className="text-xs">
                  {t('sizeSoldOut')}
                </Label>
              </div>
            ) : null}
          </div>
        </div>

        {row.is_enabled ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-${code}-label-en`}>{t('sizeLabelEn')}</Label>
              <Input
                id={`${idPrefix}-${code}-label-en`}
                value={row.label_en}
                onChange={(event) => updateRow(code, { label_en: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-${code}-label-ar`}>{t('sizeLabelAr')}</Label>
              <Input
                id={`${idPrefix}-${code}-label-ar`}
                dir="rtl"
                value={row.label_ar}
                onChange={(event) => updateRow(code, { label_ar: event.target.value })}
              />
            </div>
            {!preset ? (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor={`${idPrefix}-${code}-code`}>{t('sizeCode')}</Label>
                <Input
                  id={`${idPrefix}-${code}-code`}
                  value={row.code === 'custom' ? '' : row.code}
                  placeholder={t('sizeCodePlaceholder')}
                  dir="ltr"
                  className="font-mono lowercase"
                  onChange={(event) =>
                    updateRow(code, { code: event.target.value.trim().toLowerCase() || 'custom' })
                  }
                />
              </div>
            ) : null}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`${idPrefix}-${code}-price`}>
                {t('sizePrice')} ({currency})
              </Label>
              <Input
                id={`${idPrefix}-${code}-price`}
                type="number"
                min={0}
                step={1}
                value={Number.isFinite(row.price) ? row.price : 0}
                onChange={(event) => updateRow(code, { price: Number(event.target.value) || 0 })}
              />
            </div>
          </div>
        ) : null}

        {!preset ? (
          <Button type="button" variant="ghost" size="sm" onClick={removeCustomSize}>
            <Trash2 className="me-2 h-4 w-4" />
            {t('sizeRemoveCustom')}
          </Button>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>{t('sizeOptionsTitle')}</Label>
        <p className="text-muted-foreground mt-1 text-xs">{t('sizeOptionsHint')}</p>
      </div>

      {PRESET_SIZE_CODES.map((code) => {
        const row = rows.find((item) => item.code === code);
        if (!row) return null;
        return renderRow(row, true);
      })}

      {customRow ? renderRow(customRow, false) : null}

      {!customRow ? (
        <Button type="button" variant="outline" size="sm" onClick={addCustomSize}>
          <Plus className="me-2 h-4 w-4" />
          {t('sizeAddCustom')}
        </Button>
      ) : null}
    </div>
  );
}
