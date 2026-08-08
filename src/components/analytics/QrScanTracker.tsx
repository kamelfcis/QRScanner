'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { trackQRScan } from '@/lib/analytics';
import { persistTableNumber } from '@/lib/dining-mode';

function sessionDedupeKey(table: string) {
  return `qr-scan-tracked:${table}`;
}

function QrScanTrackerInner() {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get('table');

  useEffect(() => {
    if (!tableParam) return;

    const tableNum = parseInt(tableParam, 10);
    if (Number.isNaN(tableNum)) return;

    persistTableNumber(tableParam);

    const dedupeKey = sessionDedupeKey(tableParam);
    if (sessionStorage.getItem(dedupeKey)) return;

    sessionStorage.setItem(dedupeKey, '1');
    trackQRScan(tableNum);
  }, [tableParam]);

  return null;
}

/** Records a QR scan when the URL includes `?table=` (landing, welcome, menu). */
export function QrScanTracker() {
  return (
    <Suspense fallback={null}>
      <QrScanTrackerInner />
    </Suspense>
  );
}
