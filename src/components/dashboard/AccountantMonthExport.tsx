'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { Download, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExport } from '@/hooks/useExport';
import { useSalesReport } from '@/hooks/useSalesReport';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { hasHettSamakaTier3 } from '@/i18n/config';
import { buildAccountantExport, monthExportFilename } from '@/lib/order/accountant-export';
import { dateOnlyFromDate } from '@/lib/order/sales-range';

function currentMonthBounds(): { from: string; to: string; year: number; month: number } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const from = dateOnlyFromDate(new Date(year, month - 1, 1));
  const to = dateOnlyFromDate(new Date(year, month, 0));
  return { from, to, year, month };
}

export function AccountantMonthExport() {
  const t = useTranslations('reports');
  const { exportCSV, exportExcel } = useExport();
  const bounds = useMemo(() => currentMonthBounds(), []);

  const { data, isFetching } = useSalesReport('custom', {
    from: bounds.from,
    to: bounds.to,
    enabled: hasHettSamakaTier3,
  });

  if (!hasHettSamakaTier3) return null;

  const exportMonth = (kind: 'csv' | 'excel') => {
    const orders = data?.orders ?? [];
    const payload = buildAccountantExport(
      orders,
      {
        orderNumber: t('colOrderNumber'),
        date: t('colDate'),
        customer: t('colCustomer'),
        status: t('colStatus'),
        subtotal: t('colSubtotal'),
        delivery: t('colDelivery'),
        discount: t('colDiscount'),
        total: t('colTotal'),
      },
      monthExportFilename(bounds.year, bounds.month)
    );

    if (kind === 'csv') exportCSV(payload);
    else void exportExcel(payload);
  };

  const monthLabel = format(new Date(bounds.year, bounds.month - 1, 1), 'MMMM yyyy');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-sm">
        {t('exportMonthLabel', { month: monthLabel })}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="min-h-11"
        disabled={isFetching || !data}
        onClick={() => exportMonth('csv')}
      >
        <Download className="me-1 h-3.5 w-3.5" aria-hidden="true" />
        {t('exportMonthCsv')}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="min-h-11"
        disabled={isFetching || !data}
        onClick={() => exportMonth('excel')}
      >
        <Table className="me-1 h-3.5 w-3.5" aria-hidden="true" />
        {t('exportMonthExcel')}
      </Button>
    </div>
  );
}
