'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { startOfDay, endOfDay } from 'date-fns';
import type { DashboardStats } from '@/types/database';

const supabase = createClient();

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: async () => {
      const today = new Date();
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();

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
        supabase.from('testimonials').select('*', { count: 'exact', head: true }).eq('is_visible', true),
        supabase.from('restaurant_tables').select('*', { count: 'exact', head: true }),
        supabase.from('analytics').select('*', { count: 'exact', head: true })
          .eq('event_type', 'qr_scan')
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd),
        supabase.from('analytics').select('*', { count: 'exact', head: true })
          .eq('event_type', 'page_view')
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd),
        supabase.from('analytics').select('*', { count: 'exact', head: true })
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd),
        supabase.from('analytics').select('*', { count: 'exact', head: true })
          .eq('event_type', 'dining_order')
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd),
        supabase.from('analytics').select('*', { count: 'exact', head: true })
          .eq('event_type', 'takeaway_order')
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd),
      ]);

      const totalOrders = (diningRes.count || 0) + (takeawayRes.count || 0);
      const diningPercent = totalOrders > 0 ? Math.round(((diningRes.count || 0) / totalOrders) * 100) : 0;
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
