'use client';

import Link from 'next/link';
import { useFeatureSettings } from '@/hooks/useSettings';
import { getDashboardNav } from '@/lib/navigation/dashboardNav';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { cn } from '@/lib/utils';

type ShortcutTone = {
  well: string;
  label: string;
};

/** One pigment per destination — spice-counter wells, not pastel chips. */
const SHORTCUT_TONES: Record<string, ShortcutTone> = {
  orders: {
    well: 'bg-amber-600 dark:bg-amber-500',
    label: 'text-amber-800 dark:text-amber-300',
  },
  coupons: {
    well: 'bg-rose-600 dark:bg-rose-500',
    label: 'text-rose-800 dark:text-rose-300',
  },
  analytics: {
    well: 'bg-indigo-600 dark:bg-indigo-500',
    label: 'text-indigo-800 dark:text-indigo-300',
  },
  reports: {
    well: 'bg-slate-600 dark:bg-slate-500',
    label: 'text-slate-700 dark:text-slate-300',
  },
  menu: {
    well: 'bg-teal-600 dark:bg-teal-500',
    label: 'text-teal-800 dark:text-teal-300',
  },
  import: {
    well: 'bg-sky-600 dark:bg-sky-500',
    label: 'text-sky-800 dark:text-sky-300',
  },
  testimonials: {
    well: 'bg-violet-600 dark:bg-violet-500',
    label: 'text-violet-800 dark:text-violet-300',
  },
  qrCodes: {
    well: 'bg-brand-secondary',
    label: 'text-brand-secondary dark:text-rose-300',
  },
  tables: {
    well: 'bg-stone-600 dark:bg-stone-500',
    label: 'text-stone-700 dark:text-stone-300',
  },
  settings: {
    well: 'bg-zinc-600 dark:bg-zinc-500',
    label: 'text-zinc-700 dark:text-zinc-300',
  },
};

const FALLBACK_TONE: ShortcutTone = {
  well: 'bg-brand-secondary',
  label: 'text-foreground',
};

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
          const tone = SHORTCUT_TONES[item.key] ?? FALLBACK_TONE;
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
