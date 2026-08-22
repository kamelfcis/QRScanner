'use client';

import Link from 'next/link';
import { useFeatureSettings } from '@/hooks/useSettings';
import { getDashboardNav } from '@/lib/navigation/dashboardNav';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { cn } from '@/lib/utils';
import { DASHBOARD_NAV_TONES, FALLBACK_NAV_TONE } from '@/lib/navigation/dashboardNavTones';

export function DashboardShortcuts() {
  const { data: features } = useFeatureSettings();
  const t = useTranslations('dashboard');
  const tSidebar = useTranslations('sidebar');
  const items = getDashboardNav(features).filter((item) => item.href !== '/dashboard');

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="dashboard-shortcuts-heading">
      <h2
        id="dashboard-shortcuts-heading"
        className="font-heading mb-3 text-sm font-semibold tracking-wide"
      >
        {t('shortcuts')}
      </h2>
      <nav
        aria-label={t('shortcuts')}
        className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5"
      >
        {items.map((item) => {
          const tone = DASHBOARD_NAV_TONES[item.key] ?? FALLBACK_NAV_TONE;
          const label = tSidebar(item.key);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'bg-card flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5',
                'ring-foreground/10 ring-1',
                'hover:bg-muted/70 hover:ring-foreground/20 transition-colors',
                'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                'motion-reduce:transition-none'
              )}
            >
              <span
                className={cn(
                  'flex size-12 shrink-0 items-center justify-center rounded-2xl',
                  tone.well
                )}
                aria-hidden="true"
              >
                <Icon className="size-6 text-white" strokeWidth={1.5} />
              </span>
              <span className={cn('font-heading text-sm font-semibold leading-tight', tone.label)}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </section>
  );
}
