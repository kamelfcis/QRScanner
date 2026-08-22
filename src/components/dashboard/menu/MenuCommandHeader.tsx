'use client';

import Link from 'next/link';
import { LayoutGrid, Menu, Tag, UtensilsCrossed } from 'lucide-react';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { useMenuStats, type MenuStats } from '@/hooks/useMenuStats';
import { DASHBOARD_NAV_TONES } from '@/lib/navigation/dashboardNavTones';
import { cn } from '@/lib/utils';

const MENU_HUB_SECTIONS = [
  {
    key: 'menuCategories',
    href: '/dashboard/menu/categories',
    countKey: 'totalCategories',
    titleKey: 'menuCategoriesTitle',
    descriptionKey: 'menuCategoriesDescription',
    icon: LayoutGrid,
  },
  {
    key: 'menuProducts',
    href: '/dashboard/menu/products',
    countKey: 'totalProducts',
    titleKey: 'menuProductsTitle',
    descriptionKey: 'menuProductsDescription',
    icon: UtensilsCrossed,
  },
  {
    key: 'menuOffers',
    href: '/dashboard/menu/offers',
    countKey: 'totalOffers',
    titleKey: 'menuOffersTitle',
    descriptionKey: 'menuOffersDescription',
    icon: Tag,
  },
] as const;

function MenuStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="bg-card ring-foreground/10 flex min-h-24 flex-col gap-3 rounded-xl px-3 py-3 ring-1"
        >
          <Skeleton className="size-12 rounded-2xl" />
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-full max-w-[12rem]" />
        </div>
      ))}
    </div>
  );
}

export function MenuCommandHeader() {
  const t = useTranslations('dashboard');
  const { data: stats, isLoading, error, refetch } = useMenuStats();

  return (
    <header className="border-border bg-card relative overflow-hidden rounded-2xl border shadow-sm">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 start-0 w-1.5 bg-teal-600 dark:bg-teal-500"
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
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.16em]">
            {t('menuHubEyebrow')}
          </p>
          <h1 className="font-heading mt-2 flex items-center gap-2 text-2xl font-semibold">
            <Menu
              className="h-6 w-6 shrink-0 text-teal-700 dark:text-teal-300"
              aria-hidden="true"
            />
            {t('menuManagement')}
          </h1>
          <p className="text-muted-foreground mt-1 max-w-prose text-sm">
            {t('menuManagementDescription')}
          </p>
        </div>

        <div className="border-primary/25 border-t pt-4">
          <h2 className="font-heading mb-3 text-sm font-semibold tracking-wide">
            {t('menuShortcuts')}
          </h2>

          {error ? (
            <ErrorState error={error} retry={() => refetch()} />
          ) : isLoading || !stats ? (
            <MenuStatsSkeleton />
          ) : (
            <nav aria-label={t('menuShortcuts')} className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {MENU_HUB_SECTIONS.map((section) => {
                const tone = DASHBOARD_NAV_TONES[section.key];
                const Icon = section.icon;
                const count = stats[section.countKey as keyof MenuStats];

                return (
                  <Link
                    key={section.href}
                    href={section.href}
                    className={cn(
                      'bg-card flex min-h-11 flex-col gap-2 rounded-xl px-3 py-3',
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
                    <span className="font-heading text-2xl font-bold tabular-nums leading-none">
                      {count}
                    </span>
                    <span
                      className={cn('font-heading text-sm font-semibold leading-tight', tone.label)}
                    >
                      {t(section.titleKey)}
                    </span>
                    <span className="text-muted-foreground text-xs leading-snug">
                      {t(section.descriptionKey)}
                    </span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
