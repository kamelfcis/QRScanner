'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/shared/feedback/ConfirmDialog';
import { useCountOrdersInRange, useDeleteOrdersInRange } from '@/hooks/useOrders';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { validateDeleteRange } from '@/lib/order/delete-range';
import type { OrderStatus } from '@/types/database';

const RANGE_STATUS_OPTIONS: Array<OrderStatus | 'all'> = [
  'all',
  'completed',
  'cancelled',
  'new',
  'preparing',
  'ready',
];

interface OrdersCleanupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CleanupFields({
  rangeFrom,
  rangeTo,
  rangeStatus,
  previewCount,
  previewing,
  rangeReady,
  validationError,
  onFromChange,
  onToChange,
  onStatusChange,
}: {
  rangeFrom: string;
  rangeTo: string;
  rangeStatus: OrderStatus | 'all';
  previewCount: number | null;
  previewing: boolean;
  rangeReady: boolean;
  validationError: 'range_too_wide' | null;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onStatusChange: (value: OrderStatus | 'all') => void;
}) {
  const t = useTranslations('orders');

  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <Label htmlFor="cleanup-range-from">{t('deleteRangeFrom')}</Label>
        <Input
          id="cleanup-range-from"
          type="date"
          dir="ltr"
          className="min-h-11"
          value={rangeFrom}
          onChange={(event) => onFromChange(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cleanup-range-to">{t('deleteRangeTo')}</Label>
        <Input
          id="cleanup-range-to"
          type="date"
          dir="ltr"
          className="min-h-11"
          value={rangeTo}
          onChange={(event) => onToChange(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cleanup-range-status">{t('deleteRangeStatus')}</Label>
        <select
          id="cleanup-range-status"
          className="border-input bg-background ring-offset-background focus-visible:ring-ring flex min-h-11 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          value={rangeStatus}
          onChange={(event) => onStatusChange(event.target.value as OrderStatus | 'all')}
        >
          {RANGE_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status === 'all' ? t('deleteRangeAllStatuses') : t(`status.${status}`)}
            </option>
          ))}
        </select>
      </div>
      {validationError === 'range_too_wide' ? (
        <p className="text-destructive text-sm">{t('deleteRangeTooWide')}</p>
      ) : null}
      {rangeReady && previewing ? (
        <p className="text-muted-foreground text-sm">{t('deleteRangePreviewing')}</p>
      ) : null}
      {rangeReady && !previewing && previewCount !== null ? (
        <p className="text-muted-foreground text-sm">
          {previewCount === 0
            ? t('deleteRangeEmpty')
            : t('deleteRangePreviewResult', { count: previewCount })}
        </p>
      ) : null}
    </div>
  );
}

export function OrdersCleanupDialog({ open, onOpenChange }: OrdersCleanupDialogProps) {
  const t = useTranslations('orders');
  const tCommon = useTranslations('common');
  const isDesktop = useIsDesktop();
  const countRange = useCountOrdersInRange();
  const deleteRange = useDeleteOrdersInRange();

  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [rangeStatus, setRangeStatus] = useState<OrderStatus | 'all'>('all');
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedStatuses = rangeStatus === 'all' ? undefined : [rangeStatus];
  const rangeReady = rangeFrom.length > 0 && rangeTo.length > 0;
  const validation = rangeReady ? validateDeleteRange(rangeFrom, rangeTo) : 'invalid_date';
  const canDelete =
    validation === null && previewCount !== null && previewCount > 0 && !countRange.isPending;

  useEffect(() => {
    if (!open || !rangeReady || validation) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void countRange
        .mutateAsync({
          from: rangeFrom,
          to: rangeTo,
          statuses: selectedStatuses,
        })
        .then((count) => {
          if (!cancelled) setPreviewCount(count);
        })
        .catch((err) => {
          if (cancelled) return;
          setPreviewCount(null);
          const message = err instanceof Error ? err.message : tCommon('error');
          toast.error(message === 'range_too_wide' ? t('deleteRangeTooWide') : message);
        });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // countRange identity is unstable; trigger only on field/open changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rangeFrom, rangeTo, rangeStatus]);

  const reset = () => {
    setRangeFrom('');
    setRangeTo('');
    setRangeStatus('all');
    setPreviewCount(null);
    setConfirmOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleDeleteClick = () => {
    if (validation === 'range_too_wide') {
      toast.error(t('deleteRangeTooWide'));
      return;
    }
    if (validation) {
      toast.error(tCommon('error'));
      return;
    }
    if (previewCount === 0) {
      toast.message(t('deleteRangeEmpty'));
      return;
    }
    setConfirmOpen(true);
  };

  const handleDeleteRange = async () => {
    try {
      const result = await deleteRange.mutateAsync({
        from: rangeFrom,
        to: rangeTo,
        statuses: selectedStatuses,
      });
      toast.success(t('deleteRangeSuccess', { count: result.deleted_count }));
      handleOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : tCommon('error');
      toast.error(message === 'range_too_wide' ? t('deleteRangeTooWide') : message);
    }
  };

  const fields = (
    <CleanupFields
      rangeFrom={rangeFrom}
      rangeTo={rangeTo}
      rangeStatus={rangeStatus}
      previewCount={previewCount}
      previewing={countRange.isPending}
      rangeReady={rangeReady && validation === null}
      validationError={validation === 'range_too_wide' ? validation : null}
      onFromChange={(value) => {
        setRangeFrom(value);
        setPreviewCount(null);
      }}
      onToChange={(value) => {
        setRangeTo(value);
        setPreviewCount(null);
      }}
      onStatusChange={(value) => {
        setRangeStatus(value);
        setPreviewCount(null);
      }}
    />
  );

  const deleteButton = (
    <Button
      type="button"
      variant="destructive"
      className="min-h-11"
      disabled={!canDelete || deleteRange.isPending}
      onClick={handleDeleteClick}
    >
      <Trash2 className="me-2 h-4 w-4" aria-hidden="true" />
      {t('deleteRange')}
    </Button>
  );

  return (
    <>
      {isDesktop ? (
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('cleanupOrders')}</DialogTitle>
              <DialogDescription>{t('cleanupOrdersDescription')}</DialogDescription>
            </DialogHeader>
            {fields}
            <DialogFooter>{deleteButton}</DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={open} onOpenChange={handleOpenChange}>
          <SheetContent
            side="bottom"
            className="max-h-[85dvh] gap-0 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <SheetHeader>
              <SheetTitle>{t('cleanupOrders')}</SheetTitle>
              <SheetDescription>{t('cleanupOrdersDescription')}</SheetDescription>
            </SheetHeader>
            <div className="px-4">{fields}</div>
            <SheetFooter>{deleteButton}</SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('deleteRange')}
        description={t('deleteRangeConfirm', {
          count: previewCount ?? 0,
          from: rangeFrom,
          to: rangeTo,
        })}
        confirmLabel={tCommon('delete')}
        cancelLabel={tCommon('cancel')}
        loadingLabel={tCommon('loading')}
        variant="destructive"
        loading={deleteRange.isPending}
        onConfirm={() => void handleDeleteRange()}
      />
    </>
  );
}
