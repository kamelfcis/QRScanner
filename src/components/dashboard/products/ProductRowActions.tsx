'use client';

import { Loader2, Pencil, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { AiProductImageMode } from '@/components/dashboard/products/AiProductImageDialog';
import type { Product } from '@/types';

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

export type ProductRowActionsDensity = 'comfortable' | 'compact';

interface ProductRowActionsProps {
  product: Product;
  productName: string;
  density?: ProductRowActionsDensity;
  aiEnabled: boolean;
  batchRunning: boolean;
  isAiBusy: boolean;
  aiMode: AiProductImageMode;
  onGenerate: () => void;
  onEnhance: () => void;
  onToggleAvailability: () => void;
  onEdit: () => void;
  onDelete: () => void;
  t: TranslateFn;
  tCommon: TranslateFn;
}

export function ProductRowActions({
  product,
  productName,
  density = 'compact',
  aiEnabled,
  batchRunning,
  isAiBusy,
  aiMode,
  onGenerate,
  onEnhance,
  onToggleAvailability,
  onEdit,
  onDelete,
  t,
  tCommon,
}: ProductRowActionsProps) {
  const iconBtnClass = cn(
    'min-h-11 min-w-11',
    density === 'compact' && 'md:size-8 md:min-h-8 md:min-w-8'
  );
  const hasName = Boolean(product.name_ar?.trim() || product.name_en?.trim());
  const hasImage = Boolean(product.image_url?.trim());

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1',
        density === 'comfortable' ? 'justify-between' : 'justify-end'
      )}
    >
      <Switch
        checked={product.is_available}
        onCheckedChange={onToggleAvailability}
        aria-label={`${t('available')} — ${productName}`}
        className="mx-1"
      />
      <div className="flex flex-wrap items-center gap-1">
        {aiEnabled && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className={iconBtnClass}
              disabled={batchRunning || isAiBusy || !hasName}
              aria-label={t('rowGenerateWithAi', { name: productName })}
              title={t('generateWithAi')}
              onClick={onGenerate}
            >
              {isAiBusy && aiMode === 'generate' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={iconBtnClass}
              disabled={batchRunning || isAiBusy || !hasImage}
              aria-label={t('rowEnhanceWithAi', { name: productName })}
              title={t('enhanceWithAi')}
              onClick={onEnhance}
            >
              {isAiBusy && aiMode === 'enhance' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={iconBtnClass}
          aria-label={`${tCommon('edit')} ${productName}`}
          onClick={onEdit}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn('text-destructive', iconBtnClass)}
          onClick={onDelete}
          aria-label={`${tCommon('delete')} ${productName}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function productAiCategoryName(categoryName: string): string {
  return categoryName !== '—' ? categoryName : '';
}
