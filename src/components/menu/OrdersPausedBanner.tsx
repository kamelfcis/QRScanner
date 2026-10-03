'use client';

import { Clock, PauseCircle } from 'lucide-react';
import { useOpeningHoursStatus } from '@/hooks/useOpeningHoursStatus';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { hasDailyOps } from '@/i18n/config';

export function OrdersPausedBanner() {
  const t = useTranslations('menu');
  const tDays = useTranslations('days');
  const { enabled, paused, manualPause, outsideHours, nextOpen } = useOpeningHoursStatus();

  if (!hasDailyOps) return null;
  if (!paused) return null;

  const isHoursClosed = enabled && outsideHours && !manualPause;

  return (
    <div
      role="status"
      className="border-b border-amber-200/80 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <div className="mx-auto flex max-w-5xl items-start gap-3">
        {isHoursClosed ? (
          <Clock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        ) : (
          <PauseCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        )}
        <div className="min-w-0 space-y-0.5">
          <p className="font-heading text-sm font-semibold tracking-wide">
            {isHoursClosed ? t('closedNowTitle') : t('ordersPausedTitle')}
          </p>
          <p className="text-sm leading-relaxed opacity-90">
            {isHoursClosed && nextOpen
              ? t('closedNowDescription', {
                  time: nextOpen.time,
                  day: tDays(nextOpen.dayKey),
                })
              : isHoursClosed
                ? t('closedNowDescriptionToday')
                : t('ordersPausedDescription')}
          </p>
        </div>
      </div>
    </div>
  );
}
