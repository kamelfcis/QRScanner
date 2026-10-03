'use client';

import { CheckCircle2, Plus, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { DASHBOARD_NAV_TONES } from '@/lib/navigation/dashboardNavTones';
import { cn } from '@/lib/utils';

interface OffersCommandHeaderProps {
  totalCount: number;
  activeCount: number;
  onAddOffer: () => void;
}

export function OffersCommandHeader({
  totalCount,
  activeCount,
  onAddOffer,
}: OffersCommandHeaderProps) {
  const t = useTranslations('offers');
  const tone = DASHBOARD_NAV_TONES.menuOffers;

  return (
    <header className="border-border bg-card relative overflow-hidden rounded-2xl border shadow-sm">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 start-0 w-1.5 bg-rose-600 dark:bg-rose-500"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, transparent, transparent 27px, currentColor 27px, currentColor 28px)',
        }}
      />

      <div className="relative space-y-4 px-4 py-4 ps-6 sm:px-5 sm:ps-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.16em]">
              {t('eyebrow')}
            </p>
            <h1 className="font-heading mt-2 flex items-center gap-2 text-2xl font-semibold">
              <Tag
                className="h-6 w-6 shrink-0 text-rose-700 dark:text-rose-300"
                aria-hidden="true"
              />
              {t('title')}
            </h1>
            <p className="text-muted-foreground mt-1 max-w-prose text-sm">{t('description')}</p>
          </div>

          <Button className="min-h-11 shrink-0 self-start" onClick={onAddOffer}>
            <Plus className="me-2 h-4 w-4" aria-hidden="true" />
            {t('addOffer')}
          </Button>
        </div>

        <div className="border-primary/25 border-t pt-4">
          <div
            className="grid grid-cols-2 gap-3 sm:max-w-md"
            role="group"
            aria-label={t('statsLabel')}
          >
            <div
              className={cn(
                'bg-card flex min-h-11 flex-col gap-1 rounded-xl px-3 py-3',
                'ring-foreground/10 ring-1'
              )}
            >
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-2xl',
                  tone.well
                )}
                aria-hidden="true"
              >
                <Tag className="size-5 text-white" strokeWidth={1.5} />
              </span>
              <span className="font-heading text-2xl font-bold tabular-nums leading-none">
                {totalCount}
              </span>
              <span className={cn('font-heading text-sm font-semibold', tone.label)}>
                {t('statTotal')}
              </span>
            </div>
            <div
              className={cn(
                'bg-card flex min-h-11 flex-col gap-1 rounded-xl px-3 py-3',
                'ring-foreground/10 ring-1'
              )}
            >
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 dark:bg-emerald-500"
                aria-hidden="true"
              >
                <CheckCircle2 className="size-5 text-white" strokeWidth={1.5} />
              </span>
              <span className="font-heading text-2xl font-bold tabular-nums leading-none">
                {activeCount}
              </span>
              <span className="font-heading text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                {t('statActive')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
