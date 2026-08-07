'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { startOfDay, endOfDay, subMinutes } from 'date-fns';
import type { DashboardStats } from '@/types/database';
import { useAdminQueryEnabled } from './useAdminQueryEnabled';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
};

function assertNoError(label: string, error: { message: string } | null) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

export function useDashboardStats() {
  const enabled = useAdminQueryEnabled();

  return useQuery({
    queryKey: dashboardKeys.stats(),
    enabled,
    queryFn: async () => {
      const supabase = createClient();
      const today = new Date();
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();
      const activeSince = subMinutes(today, 30).toISOString();

      const [
        productsRes,
        categoriesRes,
        qrCodesRes,
        offersRes,
        galleryRes,
        testimonialsRes,
        tablesRes,
        todayScansRes,
        todayVisitorsRes,
        activeUsersRes,
        diningRes,
        takeawayRes,
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('categories').select('*', { count: 'exact', head: true }),
        supabase.from('qr_codes').select('*', { count: 'exact', head: true }),
        supabase.from('offers').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('gallery').select('*', { count: 'exact', head: true }),
        supabase
          .from('testimonials')
          .select('*', { count: 'exact', head: true })
          .eq('is_visible', true),
        supabase.from('restaurant_tables').select('*', { count: 'exact', head: true }),
        supabase
          .from('analytics')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'qr_scan')
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd),
        supabase
          .from('analytics')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'page_view')
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd),
        supabase
          .from('analytics')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'page_view')
          .gte('created_at', activeSince),
        supabase
          .from('analytics')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'dining_order')
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd),
        supabase
          .from('analytics')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'takeaway_order')
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd),
      ]);

      const responses = [
        ['products', productsRes],
        ['categories', categoriesRes],
        ['qr_codes', qrCodesRes],
        ['offers', offersRes],
        ['gallery', galleryRes],
        ['testimonials', testimonialsRes],
        ['restaurant_tables', tablesRes],
        ['today scans', todayScansRes],
        ['today visitors', todayVisitorsRes],
        ['active users', activeUsersRes],
        ['dining orders', diningRes],
        ['takeaway orders', takeawayRes],
      ] as const;

      for (const [label, res] of responses) {
        assertNoError(label, res.error);
      }

      const totalOrders = (diningRes.count || 0) + (takeawayRes.count || 0);
      const diningPercent =
        totalOrders > 0 ? Math.round(((diningRes.count || 0) / totalOrders) * 100) : 0;
      const takeawayPercent = totalOrders > 0 ? 100 - diningPercent : 0;

      return {
        totalProducts: productsRes.count || 0,
        totalCategories: categoriesRes.count || 0,
        totalQRCodes: qrCodesRes.count || 0,
        totalOffers: offersRes.count || 0,
        totalGallery: galleryRes.count || 0,
        totalTestimonials: testimonialsRes.count || 0,
        totalTables: tablesRes.count || 0,
        todaysScans: todayScansRes.count || 0,
        todaysVisitors: todayVisitorsRes.count || 0,
        activeUsers: activeUsersRes.count || 0,
        diningPercent,
        takeawayPercent,
      } as DashboardStats;
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });
}
