'use client';

import Link from 'next/link';
import { Ban, BellRing, ChefHat, Plus, Scale } from 'lucide-react';
import { useStaffOrderCatalog } from '@/hooks/useStaffOrder';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { cn } from '@/lib/utils';

const TILE =
  'focus-visible:ring-ring flex min-h-20 min-w-12 w-full touch-manipulation flex-col items-center justify-center gap-1 rounded-xl border-2 px-1.5 py-2 font-heading text-[0.7rem] font-semibold leading-tight shadow-sm focus-visible:outline-none focus-visible:ring-2';

interface CashierActionTilesProps {
  unackedCount: number;
  onNewOrder: () => void;
  onFocusNew: () => void;
  onOpenSoldOut: () => void;
}

export function CashierActionTiles({
  unackedCount,
  onNewOrder,
  onFocusNew,
  onOpenSoldOut,
}: CashierActionTilesProps) {
  const t = useTranslations('orders');
  const { data: catalog } = useStaffOrderCatalog({ includeUnavailable: true });
  const soldOutCount = (catalog ?? [])
    .flatMap((category) => category.products)
    .filter((product) => !product.is_available).length;

  return (
    <div className="bg-background/95 supports-backdrop-filter:backdrop-blur-sm sticky top-0 z-20 -mx-4 px-4 py-2 sm:-mx-6 sm:px-6">
      <div
        className="grid grid-cols-3 gap-2 sm:grid-cols-5"
        role="toolbar"
        aria-label={t('cashierTilePad')}
      >
        <button
          type="button"
          onClick={onNewOrder}
          className={cn(
            TILE,
            'border-amber-600 bg-[#D97706] text-white hover:bg-amber-600 dark:border-amber-400'
          )}
        >
          <Plus className="h-5 w-5 shrink-0" aria-hidden="true" />
          {t('cashierTileNewOrder')}
        </button>

        <button
          type="button"
          onClick={onFocusNew}
          className={cn(
            TILE,
            'border-amber-600 bg-amber-50 text-amber-950 hover:bg-amber-100 dark:border-amber-400 dark:bg-amber-950/50 dark:text-amber-100'
          )}
        >
          <BellRing className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="flex items-center gap-1">
            {t('cashierTileUnacked')}
            {unackedCount > 0 ? (
              <span className="rounded-full bg-amber-600 px-1.5 py-px text-[0.65rem] font-bold tabular-nums text-white">
                {unackedCount}
              </span>
            ) : null}
          </span>
        </button>

        <Link
          href="/kitchen"
          className={cn(
            TILE,
            'border-orange-700 bg-orange-700 text-white hover:bg-orange-800 dark:border-orange-500'
          )}
        >
          <ChefHat className="h-5 w-5 shrink-0" aria-hidden="true" />
          {t('cashierTileKitchen')}
        </Link>

        <Link
          href="/dashboard/shift"
          className={cn(
            TILE,
            'border-emerald-700 bg-[#047857] text-white hover:bg-emerald-800 dark:border-emerald-500'
          )}
        >
          <Scale className="h-5 w-5 shrink-0" aria-hidden="true" />
          {t('cashierTileShift')}
        </Link>

        <button
          type="button"
          onClick={onOpenSoldOut}
          className={cn(
            TILE,
            'border-rose-600 bg-[#E11D48] text-white hover:bg-rose-600 dark:border-rose-400'
          )}
        >
          <Ban className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="flex items-center gap-1">
            {t('cashierTileSoldOut')}
            {soldOutCount > 0 ? (
              <span className="rounded-full bg-white/20 px-1.5 py-px text-[0.65rem] font-bold tabular-nums">
                {soldOutCount}
              </span>
            ) : null}
          </span>
        </button>
      </div>
    </div>
  );
}
