'use client';

import Link from 'next/link';
import { ArrowLeft, BellRing, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SoldOutPanel } from '@/components/dashboard/sold-out/SoldOutPanel';
import { useOrderAlerts } from '@/hooks/useOrderAlerts';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { CashierBottomNav, useShowCashierBottomNav } from '@/components/dashboard/CashierBottomNav';
import { cn } from '@/lib/utils';

export function KitchenShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('kitchen');
  const tOrders = useTranslations('orders');
  const showCashierNav = useShowCashierBottomNav();
  const { soundBlocked, enableSound, prefersReducedMotion, unacknowledged } = useOrderAlerts();

  return (
    <div
      className={cn(
        'bg-muted/20 flex h-dvh h-screen flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]',
        showCashierNav && 'max-md:pb-[calc(3.5rem+env(safe-area-inset-bottom))]'
      )}
    >
      <header className="bg-background/95 supports-backdrop-filter:backdrop-blur-sm sticky top-0 z-30 border-b px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <ChefHat
              className="h-7 w-7 shrink-0 text-amber-700 dark:text-amber-400"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h1 className="font-heading truncate text-lg font-semibold sm:text-xl">
                {t('title')}
              </h1>
              <p className="text-muted-foreground truncate text-xs sm:text-sm">{t('subtitle')}</p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {soundBlocked && !prefersReducedMotion ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => void enableSound()}
              >
                <BellRing className="me-2 h-4 w-4" aria-hidden="true" />
                {tOrders('enableSound')}
              </Button>
            ) : null}
            {unacknowledged.length > 0 ? (
              <span className="inline-flex min-h-9 items-center rounded-full bg-amber-100 px-3 text-xs font-semibold tabular-nums text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                {t('awaitingCount', { count: unacknowledged.length })}
              </span>
            ) : null}
            <SoldOutPanel />
            <Button
              render={<Link href="/dashboard/orders" />}
              variant="secondary"
              className="min-h-11"
            >
              <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              {t('backToOrders')}
            </Button>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto min-h-0 w-full max-w-[1600px] flex-1 overflow-y-auto p-4 sm:p-6"
        tabIndex={-1}
      >
        {children}
      </main>
      <CashierBottomNav />
    </div>
  );
}
