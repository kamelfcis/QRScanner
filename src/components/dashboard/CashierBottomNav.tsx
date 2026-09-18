'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CASHIER_NAV_KEYS, getDashboardNav } from '@/lib/navigation/dashboardNav';
import { hasHettSamakaTier3 } from '@/i18n/config';
import { useFeatureSettings, useRestaurantSettings } from '@/hooks/useSettings';
import { useStaffRole } from '@/hooks/useStaffRole';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { cn } from '@/lib/utils';

export function useShowCashierBottomNav(): boolean {
  const pathname = usePathname();
  const { data: role } = useStaffRole();
  if (!hasHettSamakaTier3) return false;
  const onOrders = pathname === '/dashboard/orders' || pathname.startsWith('/dashboard/orders/');
  return role === 'cashier' || onOrders;
}

export function CashierBottomNav() {
  const pathname = usePathname();
  const show = useShowCashierBottomNav();
  const { data: features } = useFeatureSettings();
  const { data: settings } = useRestaurantSettings();
  const tSidebar = useTranslations('sidebar');

  if (!show) return null;

  const items = getDashboardNav(features, settings, 'cashier').filter((item) =>
    CASHIER_NAV_KEYS.has(item.key)
  );

  if (items.length === 0) return null;

  return (
    <nav
      aria-label={tSidebar('dashboard')}
      className="border-border bg-background/95 supports-backdrop-filter:backdrop-blur-sm fixed inset-x-0 bottom-0 z-40 border-t md:hidden"
    >
      <ul className="grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
          const label = tSidebar(item.key);
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'focus-visible:ring-ring flex min-h-14 touch-manipulation flex-col items-center justify-center gap-0.5 px-1 text-[0.7rem] font-medium focus-visible:outline-none focus-visible:ring-2',
                  isActive ? 'text-secondary' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="max-w-full truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
