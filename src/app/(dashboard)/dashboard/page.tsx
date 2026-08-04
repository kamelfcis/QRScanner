'use client';

import { format } from 'date-fns';
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
} from 'lucide-react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useAnalyticsSummary } from '@/hooks/useAnalytics';
import { useRealtimeAnalytics } from '@/hooks/useRealtime';
import { KPICard } from '@/components/dashboard/kpi';
import { LineAreaChart, PieDonutChart, ChartCard } from '@/components/dashboard/charts';
import dynamic from 'next/dynamic';

const ActivityFeed = dynamic(() => import('@/components/dashboard/ActivityFeed').then(m => ({ default: m.ActivityFeed })), { ssr: false });
import { useTheme } from '@/components/providers/ThemeProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { useTranslations } from '@/components/providers/RootI18nProvider';

export default function DashboardPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  useRealtimeAnalytics();
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: statsRefetch } = useDashboardStats();
  const { data: todaySummary, isLoading: summaryLoading } = useAnalyticsSummary('today');
  const t = useTranslations('dashboard');

  if (statsError) {
    return <ErrorState error={statsError} retry={statsRefetch} />;
  }

  const kpis = stats
    ? [
        { title: t('todaysScans'), value: stats.todaysScans, icon: QrCode, color: 'bg-blue-500/10 text-blue-500' },
        { title: t('todaysVisitors'), value: stats.todaysVisitors, icon: Users, color: 'bg-green-500/10 text-green-500' },
        { title: t('activeUsers'), value: stats.activeUsers, icon: Activity, color: 'bg-purple-500/10 text-purple-500' },
        { title: t('diningPercent'), value: stats.diningPercent + '%', icon: UtensilsCrossed, color: 'bg-brand-primary/10 text-brand-primary' },
        { title: t('takeawayPercent'), value: stats.takeawayPercent + '%', icon: ShoppingBag, color: 'bg-brand-secondary/10 text-brand-secondary' },
        { title: t('totalProducts'), value: stats.totalProducts, icon: Menu, color: 'bg-orange-500/10 text-orange-500' },
        { title: t('totalCategories'), value: stats.totalCategories, icon: LayoutDashboard, color: 'bg-teal-500/10 text-teal-500' },
        { title: t('activeOffers'), value: stats.totalOffers, icon: Tag, color: 'bg-red-500/10 text-red-500' },
        { title: t('galleryImages'), value: stats.totalGallery, icon: ImageIcon, color: 'bg-brand-accent/10 text-brand-accent' },
        { title: t('testimonials'), value: stats.totalTestimonials, icon: MessageSquareQuote, color: 'bg-indigo-500/10 text-indigo-500' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{t('title')}</h1>
        <p className="text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {statsLoading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-2 w-20" />
              </div>
            ))
          : kpis.map((kpi) => (
              <KPICard
                key={kpi.title}
                title={kpi.title}
                value={kpi.value}
                icon={<kpi.icon className="h-5 w-5" />}
                color={kpi.color}
              />
            ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title={t('todayActivity')} description={t('visitorsOverTimeToday')}>
            {summaryLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <LineAreaChart
                data={todaySummary?.map((s) => ({ time: s.date, visitors: s.visitors })) || []}
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
          {summaryLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <PieDonutChart
              data={[
                { name: t('dining'), value: stats?.diningPercent || 0, color: isDark ? '#DAA520' : '#B8860B' },
                { name: t('takeaway'), value: stats?.takeawayPercent || 0, color: isDark ? '#A52A2A' : '#8B0000' },
              ]}
              donut
            />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
