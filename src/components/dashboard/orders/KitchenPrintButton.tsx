'use client';

import { useState } from 'react';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { KitchenTicket } from '@/components/dashboard/orders/KitchenTicket';
import { kitchenDomId, printReceiptElement } from '@/lib/order/print-receipt';
import type { OrderWithItems } from '@/types/database';
import { cn } from '@/lib/utils';

type KitchenCopy = (key: string, values?: Record<string, string | number>) => string;

export function KitchenPrintButton({
  order,
  locale,
  t,
  disabled,
  className,
  variant = 'outline',
}: {
  order: OrderWithItems;
  locale: string;
  t: KitchenCopy;
  disabled?: boolean;
  className?: string;
  variant?: 'outline' | 'secondary' | 'default';
}) {
  const [busy, setBusy] = useState(false);

  const handlePrint = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const node = document.getElementById(kitchenDomId(order.id));
    if (!node) {
      toast.error(t('printKitchenFailed'));
      return;
    }
    setBusy(true);
    try {
      await printReceiptElement(node);
    } catch {
      toast.error(t('printKitchenFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="pointer-events-none fixed start-[-2000px] top-0" aria-hidden="true">
        <KitchenTicket order={order} locale={locale} t={t} />
      </div>
      <Button
        type="button"
        variant={variant}
        className={cn('min-h-11 whitespace-normal', className)}
        disabled={disabled || busy}
        aria-label={t('printKitchen')}
        onClick={(event) => void handlePrint(event)}
      >
        <Printer className="me-2 h-4 w-4 shrink-0" aria-hidden="true" />
        {t('printKitchen')}
      </Button>
    </>
  );
}
