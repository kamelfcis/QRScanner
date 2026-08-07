'use client';

import { useState } from 'react';
import {
  QrCode,
  Users,
  Activity,
  UtensilsCrossed,
  ShoppingBag,
  Menu,
  LayoutDashboard,
  Tag,
  ImageIcon,
  MessageSquareQuote,
  ChevronDown,
} from 'lucide-react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useTodayHourlyVisitors } from '@/hooks/useAnalytics';
import { useRealtimeAnalytics } from '@/hooks/useRealtime';
import { KPICard } from '@/components/dashboard/kpi';
import { LineAreaChart, PieDonutChart, ChartCard } from '@/components/dashboard/charts';
import dynamic from 'next/dynamic';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { formatLocaleDate } from '@/lib/dateLocale';
import { cn } from '@/lib/utils';

const ActivityFeed = dynamic(
  () => import('@/components/dashboard/ActivityFeed').then((m) => ({ default: m.ActivityFeed })),
  { ssr: false }
);

export default function DashboardPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  useRealtimeAnalytics();
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: statsRefetch,
  } = useDashboardStats();
  const { data: hourlyVisitors, isLoading: hourlyLoading } = useTodayHourlyVisitors();
  const t = useTranslations('dashboard');
  const tAnalytics = useTranslations('analytics');
  const { locale } = useI18n();
  const [showSecondary, setShowSecondary] = useState(false);

  if (statsError) {
    return <ErrorState error={statsError} retry={statsRefetch} />;
  }

  const primaryKpis = stats
    ? [
        {
          title: t('todaysScans'),
          value: stats.todaysScans,
          icon: QrCode,
          color: 'bg-blue-500/10 text-blue-500',
        },
        {
          title: t('todaysVisitors'),
          value: stats.todaysVisitors,
          icon: Users,
          color: 'bg-green-500/10 text-green-500',
        },
        {
          title: t('activeUsers'),
          value: stats.activeUsers,
          icon: Activity,
          color: 'bg-purple-500/10 text-purple-500',
        },
        {
          title: t('diningPercent'),
          value: stats.diningPercent + '%',
          icon: UtensilsCrossed,
          color: 'bg-brand-primary/10 text-brand-primary',
        },
        {
          title: t('takeawayPercent'),
          value: stats.takeawayPercent + '%',
          icon: ShoppingBag,
          color: 'bg-brand-secondary/10 text-brand-secondary',
        },
      ]
    : [];

  const secondaryKpis = stats
    ? [
        {
          title: t('totalProducts'),
          value: stats.totalProducts,
          icon: Menu,
          color: 'bg-orange-500/10 text-orange-500',
        },
        {
          title: t('totalCategories'),
          value: stats.totalCategories,
          icon: LayoutDashboard,
          color: 'bg-teal-500/10 text-teal-500',
        },
        {
          title: t('activeOffers'),
          value: stats.totalOffers,
          icon: Tag,
          color: 'bg-red-500/10 text-red-500',
        },
        {
          title: t('galleryImages'),
          value: stats.totalGallery,
          icon: ImageIcon,
          color: 'bg-brand-accent/10 text-brand-accent',
        },
        {
          title: t('testimonials'),
          value: stats.totalTestimonials,
          icon: MessageSquareQuote,
          color: 'bg-indigo-500/10 text-indigo-500',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold md:text-3xl">{t('title')}</h1>
        <p className="text-muted-foreground" suppressHydrationWarning>
          {formatLocaleDate(new Date(), 'EEEE, MMMM d, yyyy', locale)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-5">
        {statsLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-3 rounded-lg border p-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-2 w-20" />
              </div>
            ))
          : primaryKpis.map((kpi) => (
              <KPICard
                key={kpi.title}
                title={kpi.title}
                value={kpi.value}
                icon={<kpi.icon className="h-5 w-5" />}
                color={kpi.color}
              />
            ))}
      </div>

      <div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground mb-3 gap-1"
          onClick={() => setShowSecondary((v) => !v)}
          aria-expanded={showSecondary}
        >
          {t('moreMetrics')}
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', showSecondary && 'rotate-180')}
          />
        </Button>
        {showSecondary && (
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
              {t('secondaryMetrics')}
            </p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-5">
              {statsLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-3 rounded-lg border p-4">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  ))
                : secondaryKpis.map((kpi) => (
                    <KPICard
                      key={kpi.title}
                      title={kpi.title}
                      value={kpi.value}
                      icon={<kpi.icon className="h-5 w-5" />}
                      color={kpi.color}
                    />
                  ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title={t('todayActivity')} description={t('visitorsOverTimeToday')}>
            {hourlyLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : !hourlyVisitors?.some((h) => h.visitors > 0) ? (
              <p className="text-muted-foreground flex h-[300px] items-center justify-center text-sm">
                {tAnalytics('noDataYet')}
              </p>
            ) : (
              <LineAreaChart
                data={hourlyVisitors.map((h) => ({ time: h.time, visitors: h.visitors }))}
                xKey="time"
                yKey="visitors"
                type="area"
              />
            )}
          </ChartCard>
        </div>

        <div>
          <ActivityFeed />
        </div>
      </div>

      <div>
        <ChartCard title={t('diningVsTakeaway')} description={t('todayOrderBreakdown')}>
          {statsLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (stats?.diningPercent || 0) + (stats?.takeawayPercent || 0) === 0 ? (
            <p className="text-muted-foreground flex h-[300px] items-center justify-center text-sm">
              {tAnalytics('noDataYet')}
            </p>
          ) : (
            <PieDonutChart
              data={[
                {
                  name: t('dining'),
                  value: stats?.diningPercent || 0,
                  color: isDark ? '#DAA520' : '#B8860B',
                },
                {
                  name: t('takeaway'),
                  value: stats?.takeawayPercent || 0,
                  color: isDark ? '#A52A2A' : '#8B0000',
                },
              ]}
              donut
            />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
