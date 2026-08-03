'use client';

import { useEffect } from 'react';
import { reportWebVitals } from '@/lib/monitoring';

export function WebVitals() {
  useEffect(() => {
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
          reportWebVitals({ name: 'LCP', value: lastEntry.startTime, id: 'lcp' });
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            const fidEntry = entry as PerformanceEntry & { processingStart: number };
            reportWebVitals({ name: 'FID', value: fidEntry.processingStart - fidEntry.startTime, id: 'fid' });
          });
        });
        fidObserver.observe({ type: 'first-input', buffered: true });
      } catch {
        // PerformanceObserver not fully supported
      }
    }
  }, []);

  return null;
}
