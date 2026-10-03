'use client';

import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useCategoriesWithProducts } from '@/hooks/useCategories';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { hasHettSamakaTier3 } from '@/i18n/config';
import { readLastOrder } from '@/lib/order/last-order';
import { buildRepeatCartItems, hasRepeatableLastOrder } from '@/lib/order/repeat-last-order';
import { useCartStore } from '@/stores/cart-store';
import { cn } from '@/lib/utils';

type RepeatLastOrderButtonProps = {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  fullWidth?: boolean;
};

export function RepeatLastOrderButton({
  className,
  variant = 'outline',
  size = 'default',
  fullWidth = false,
}: RepeatLastOrderButtonProps) {
  const t = useTranslations('cart');
  const { data: categories } = useCategoriesWithProducts();
  const addItem = useCartStore((s) => s.addItem);
  const setMeta = useCartStore((s) => s.setMeta);
  const [busy, setBusy] = useState(false);

  const snapshot = useMemo(() => (hasHettSamakaTier3 ? readLastOrder() : null), []);
  const visible = hasHettSamakaTier3 && hasRepeatableLastOrder(snapshot);

  const catalogProducts = useMemo(
    () => categories?.flatMap((c) => c.products ?? []) ?? [],
    [categories]
  );

  if (!visible || !snapshot?.items) return null;

  const handleRepeat = () => {
    setBusy(true);
    try {
      const result = buildRepeatCartItems(snapshot.items, catalogProducts);
      if (result.added.length === 0) {
        toast.error(t('repeatLastOrderNone'));
        return;
      }

      for (const item of result.added) {
        addItem(item);
      }

      if (
        snapshot.diningMode ||
        snapshot.fulfillmentType ||
        snapshot.customerName ||
        snapshot.phone
      ) {
        setMeta({
          ...(snapshot.diningMode ? { diningMode: snapshot.diningMode } : {}),
          ...(snapshot.fulfillmentType ? { fulfillmentType: snapshot.fulfillmentType } : {}),
          ...(snapshot.customerName ? { customerName: snapshot.customerName } : {}),
          ...(snapshot.phone ? { customerPhone: snapshot.phone } : {}),
        });
      }

      const skipped = result.skippedUnavailable.length + result.skippedMissing.length;
      if (skipped > 0) {
        toast.success(t('repeatLastOrderPartial', { added: result.added.length, skipped }));
      } else {
        toast.success(t('repeatLastOrderSuccess', { count: result.added.length }));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(fullWidth && 'w-full', 'min-h-11', className)}
      onClick={handleRepeat}
      disabled={busy}
      data-testid="repeat-last-order"
    >
      <RotateCcw className="me-2 h-4 w-4" aria-hidden="true" />
      {t('repeatLastOrder')}
    </Button>
  );
}
