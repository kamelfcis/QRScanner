'use client';

import Link from 'next/link';
import { AlertTriangle, Menu, TicketPercent } from 'lucide-react';
import { useMemo } from 'react';
import { useCoupons } from '@/hooks/useCoupons';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useOrders } from '@/hooks/useOrders';
import { useFeatureSettings } from '@/hooks/useSettings';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { DASHBOARD_NAV_TONES } from '@/lib/navigation/dashboardNavTones';
import { cn } from '@/lib/utils';
import type { OrderWithItems } from '@/types/database';

function isUnacknowledged(order: OrderWithItems): boolean {
  return order.status === 'new' && !order.staff_acknowledged_at;
}

function couponIsActive(coupon: {
  is_active: boolean;
  max_redemptions: number | null;
  redeemed_count: number;
  starts_at: string | null;
  ends_at: string | null;
}): boolean {
  const now = Date.now();
  if (!coupon.is_active) return false;
  if (coupon.max_redemptions != null && coupon.redeemed_count >= coupon.max_redemptions) {
    return false;
  }
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) return false;
  if (coupon.ends_at && new Date(coupon.ends_at).getTime() < now) return false;
  return true;
}

export function DashboardNeedsAttention() {
  const t = useTranslations('dashboard');
  const { data: features } = useFeatureSettings();
  const { data: orders } = useOrders();
  const { data: stats } = useDashboardStats();
  const { data: coupons } = useCoupons();

  const ordersEnabled = features?.dashboard_orders === true;
  const couponsEnabled = features?.coupons === true;

  const unackedCount = useMemo(() => (orders ?? []).filter(isUnacknowledged).length, [orders]);
  const productsCount = stats?.totalProducts ?? 0;
  const activeCouponsCount = useMemo(
    () => (coupons ?? []).filter(couponIsActive).length,
    [coupons]
  );

  const tiles = [
    ordersEnabled
      ? {
          key: 'orders',
          href: '/dashboard/orders',
          count: unackedCount,
          label: t('needsAttentionOrders'),
          icon: AlertTriangle,
          tone: DASHBOARD_NAV_TONES.orders,
          emphasize: unackedCount > 0,
        }
      : null,
    {
      key: 'menu',
      href: '/dashboard/menu',
      count: productsCount,
      label: t('needsAttentionMenu'),
      icon: Menu,
      tone: DASHBOARD_NAV_TONES.menu,
      emphasize: productsCount === 0,
    },
    couponsEnabled
      ? {
          key: 'coupons',
          href: '/dashboard/coupons',
          count: activeCouponsCount,
          label: t('needsAttentionCoupons'),
          icon: TicketPercent,
          tone: DASHBOARD_NAV_TONES.coupons,
          emphasize: activeCouponsCount === 0,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    href: string;
    count: number;
    label: string;
    icon: typeof AlertTriangle;
    tone: { well: string; label: string };
    emphasize: boolean;
  }>;

  if (tiles.length === 0) return null;

  return (
    <section aria-labelledby="dashboard-needs-attention-heading">
      <h2
        id="dashboard-needs-attention-heading"
        className="font-heading mb-3 text-sm font-semibold tracking-wide"
      >
        {t('needsAttention')}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.key}
              href={tile.href}
              className={cn(
                'bg-card flex min-h-11 items-center gap-3 rounded-xl px-3 py-3',
                'ring-foreground/10 ring-1',
                'hover:bg-muted/70 hover:ring-foreground/20 transition-colors',
                'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                tile.emphasize && 'ring-amber-500/40'
              )}
            >
              <span
                className={cn(
                  'flex size-12 shrink-0 items-center justify-center rounded-2xl',
                  tile.tone.well
                )}
                aria-hidden="true"
              >
                <Icon className="size-6 text-white" strokeWidth={1.5} />
              </span>
              <span className="min-w-0">
                <span className="font-heading block text-2xl font-bold tabular-nums leading-none">
                  {tile.count}
                </span>
                <span
                  className={cn('font-heading mt-1 block text-sm font-semibold', tile.tone.label)}
                >
                  {tile.label}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
