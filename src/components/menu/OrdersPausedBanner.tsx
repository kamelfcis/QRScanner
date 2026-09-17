'use client';

import { PauseCircle } from 'lucide-react';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { hasHettSamakaTier1 } from '@/i18n/config';

export function OrdersPausedBanner() {
  const t = useTranslations('menu');
  const { data: settings } = useRestaurantSettings();

  if (!hasHettSamakaTier1) return null;
  if (settings?.accepting_orders !== false) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-200/80 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <div className="mx-auto flex max-w-5xl items-start gap-3">
        <PauseCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 space-y-0.5">
          <p className="font-heading text-sm font-semibold tracking-wide">
            {t('ordersPausedTitle')}
          </p>
          <p className="text-sm leading-relaxed opacity-90">{t('ordersPausedDescription')}</p>
        </div>
      </div>
    </div>
  );
}
