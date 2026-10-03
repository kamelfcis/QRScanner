'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import type {
  AnalyticsSummary,
  HourlyVisitors,
  RecentActivityItem,
  TopItem,
  SearchTerm,
  PeakHour,
  TableUsage,
} from '@/types/database';
import { useAdminQueryEnabled } from './useAdminQueryEnabled';

export const analyticsKeys = {
  all: ['analytics'] as const,
  summary: (period: string) => [...analyticsKeys.all, 'summary', period] as const,
  hourlyToday: () => [...analyticsKeys.all, 'hourly-today'] as const,
  recentActivity: (limit: number) => [...analyticsKeys.all, 'recent-activity', limit] as const,
  topProducts: (period: string) => [...analyticsKeys.all, 'top-products', period] as const,
  topCategories: (period: string) => [...analyticsKeys.all, 'top-categories', period] as const,
  searchTerms: (period: string) => [...analyticsKeys.all, 'search-terms', period] as const,
  peakHours: (period: string) => [...analyticsKeys.all, 'peak-hours', period] as const,
  peakDays: (period: string) => [...analyticsKeys.all, 'peak-days', period] as const,
  tableUsage: () => [...analyticsKeys.all, 'table-usage'] as const,
  diningTakeaway: (period: string) => [...analyticsKeys.all, 'dining-takeaway', period] as const,
  devices: (period: string) => [...analyticsKeys.all, 'devices', period] as const,
};

function formatActivityTitle(eventType: string, eventData: Record<string, unknown> | null): string {
  const ed = eventData ?? {};
  switch (eventType) {
    case 'qr_scan':
      return ed.table_number ? `QR scan at table ${ed.table_number}` : 'QR code scanned';
    case 'page_view':
      return ed.page ? `Page viewed: ${ed.page}` : 'Page viewed';
    case 'product_view':
      return ed.product_name ? `Product viewed: ${ed.product_name}` : 'Product viewed';
    case 'category_view':
      return ed.category_name ? `Category viewed: ${ed.category_name}` : 'Category viewed';
    case 'dining_order':
      return 'Dining order';
    case 'takeaway_order':
      return 'Takeaway order';
    case 'order_whatsapp':
      return 'WhatsApp order sent';
    case 'add_to_cart':
      return 'Item added to cart';
    case 'checkout_start':
      return 'Checkout started';
    case 'search':
      return ed.search_term ? `Search: "${ed.search_term}"` : 'Menu search';
    case 'offer_click':
      return ed.offer_title ? `Offer clicked: ${ed.offer_title}` : 'Offer clicked';
    case 'favorite_toggle':
      return 'Favorite updated';
    default:
      return eventType.replace(/_/g, ' ');
  }
}

export function getDateRange(period: string) {
  const now = new Date();
  switch (period) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfDay(now) };
    case 'month':
      return { start: startOfMonth(now), end: endOfDay(now) };
    case 'year':
      return { start: subDays(now, 365), end: endOfDay(now) };
    default:
      return { start: subDays(now, 30), end: endOfDay(now) };
  }
}

export function useAnalyticsSummary(period: string = 'week') {
  const enabled = useAdminQueryEnabled();

  return useQuery({
    queryKey: analyticsKeys.summary(period),
    enabled,
    queryFn: async () => {
      const supabase = createClient();
      const { start, end } = getDateRange(period);
      const { data, error } = await supabase
        .from('analytics')
        .select('created_at, event_type, event_data')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at');

      if (error) throw error;

      const dailyMap = new Map<string, AnalyticsSummary>();
      (data || []).forEach((item) => {
        const day = format(new Date(item.created_at), 'yyyy-MM-dd');
        if (!dailyMap.has(day)) {
          dailyMap.set(day, { date: day, visitors: 0, scans: 0, dining: 0, takeaway: 0 });
        }
        const entry = dailyMap.get(day)!;
        if (item.event_type === 'page_view') entry.visitors++;
        if (item.event_type === 'qr_scan') entry.scans++;
        if (item.event_type === 'dining_order') entry.dining++;
        if (item.event_type === 'takeaway_order') entry.takeaway++;
      });

      return Array.from(dailyMap.values());
    },
    staleTime: 30 * 1000,
  });
}

export function useTodayHourlyVisitors() {
  const enabled = useAdminQueryEnabled();

  return useQuery({
    queryKey: analyticsKeys.hourlyToday(),
    enabled,
    queryFn: async () => {
      const supabase = createClient();
      const start = startOfDay(new Date());
      const end = endOfDay(new Date());

      const { data, error } = await supabase
        .from('analytics')
        .select('created_at')
        .eq('event_type', 'page_view')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at');

      if (error) throw error;

      const hours: HourlyVisitors[] = Array.from({ length: 24 }, (_, hour) => {
        const slot = new Date(start);
        slot.setHours(hour, 0, 0, 0);
        return {
          hour,
          time: format(slot, 'ha'),
          visitors: 0,
        };
      });

      (data || []).forEach((item) => {
        const hour = new Date(item.created_at).getHours();
        hours[hour].visitors++;
      });

      return hours;
    },
    staleTime: 30 * 1000,
  });
}

export function useRecentActivity(limit: number = 10) {
  const enabled = useAdminQueryEnabled();

  return useQuery({
    queryKey: analyticsKeys.recentActivity(limit),
    enabled,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('analytics')
        .select('id, event_type, event_data, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((row): RecentActivityItem => ({
        id: row.id,
        type: row.event_type,
        title: formatActivityTitle(
          row.event_type,
          row.event_data as Record<string, unknown> | null
        ),
        created_at: row.created_at,
      }));
    },
    staleTime: 15 * 1000,
  });
}

export function useTopProducts(period: string = 'month', limit: number = 10) {
  const enabled = useAdminQueryEnabled();

  return useQuery({
    queryKey: analyticsKeys.topProducts(period),
    enabled,
    queryFn: async () => {
      const supabase = createClient();
      const { start, end } = getDateRange(period);
      const { data, error } = await supabase
        .from('analytics')
        .select('event_data, created_at')
        .eq('event_type', 'product_view')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      const productCounts = new Map<string, { name: string; name_ar: string; views: number }>();
      (data || []).forEach((item) => {
        const ed = item.event_data as Record<string, unknown> | null;
        if (ed?.product_id && ed?.product_name) {
          const id = ed.product_id as string;
          const existing = productCounts.get(id);
          if (existing) {
            existing.views++;
          } else {
            productCounts.set(id, {
              name: ed.product_name as string,
              name_ar: (ed.product_name_ar as string) || '',
              views: 1,
            });
          }
        }
      });

      return Array.from(productCounts.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.views - a.views)
        .slice(0, limit);
    },
    staleTime: 60 * 1000,
  });
}

export function useTopCategories(period: string = 'month', limit: number = 10) {
  const enabled = useAdminQueryEnabled();

  return useQuery({
    queryKey: analyticsKeys.topCategories(period),
    enabled,
    queryFn: async () => {
      const supabase = createClient();
      const { start, end } = getDateRange(period);
      const { data, error } = await supabase
        .from('analytics')
        .select('event_data, created_at')
        .eq('event_type', 'category_view')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      const categoryCounts = new Map<string, { name: string; name_ar: string; views: number }>();
      (data || []).forEach((item) => {
        const ed = item.event_data as Record<string, unknown> | null;
        if (ed?.category_id && ed?.category_name) {
          const id = ed.category_id as string;
          const existing = categoryCounts.get(id);
          if (existing) {
            existing.views++;
          } else {
            categoryCounts.set(id, {
              name: ed.category_name as string,
              name_ar: (ed.category_name_ar as string) || '',
              views: 1,
            });
          }
        }
      });

      return Array.from(categoryCounts.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.views - a.views)
        .slice(0, limit);
    },
    staleTime: 60 * 1000,
  });
}

export function useSearchTerms(period: string = 'month', limit: number = 20) {
  const enabled = useAdminQueryEnabled();

  return useQuery({
    queryKey: analyticsKeys.searchTerms(period),
    enabled,
    queryFn: async () => {
      const supabase = createClient();
      const { start, end } = getDateRange(period);
      const { data, error } = await supabase
        .from('search_analytics')
        .select('search_term, results_count, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      const termCounts = new Map<string, { count: number; totalResults: number }>();
      (data || []).forEach((item) => {
        const term = item.search_term.toLowerCase();
        const existing = termCounts.get(term);
        if (existing) {
          existing.count++;
          existing.totalResults += item.results_count;
        } else {
          termCounts.set(term, { count: 1, totalResults: item.results_count });
        }
      });

      return Array.from(termCounts.entries())
        .map(([term, data]) => ({
          term,
          count: data.count,
          avgResults: Math.round(data.totalResults / data.count),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    },
    staleTime: 60 * 1000,
  });
}

export function usePeakHours(period: string = 'month') {
  const enabled = useAdminQueryEnabled();

  return useQuery({
    queryKey: analyticsKeys.peakHours(period),
    enabled,
    queryFn: async () => {
      const supabase = createClient();
      const { start, end } = getDateRange(period);
      const { data, error } = await supabase
        .from('analytics')
        .select('created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      const hourCounts = new Array(24).fill(0).map((_, i) => ({ hour: i, count: 0 }));
      (data || []).forEach((item) => {
        const hour = new Date(item.created_at).getHours();
        hourCounts[hour].count++;
      });

      return hourCounts;
    },
    staleTime: 60 * 1000,
  });
}

export function usePeakDays(period: string = 'month') {
  const enabled = useAdminQueryEnabled();

  return useQuery({
    queryKey: analyticsKeys.peakDays(period),
    enabled,
    queryFn: async () => {
      const supabase = createClient();
      const { start, end } = getDateRange(period);
      const { data, error } = await supabase
        .from('analytics')
        .select('created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      const dayNames = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      const dayCounts = dayNames.map((name, i) => ({ day: name, dayIndex: i, count: 0 }));
      (data || []).forEach((item) => {
        const dayIndex = new Date(item.created_at).getDay();
        dayCounts[dayIndex].count++;
      });

      return dayCounts;
    },
    staleTime: 60 * 1000,
  });
}

export function useTableUsage() {
  const enabled = useAdminQueryEnabled();

  return useQuery({
    queryKey: analyticsKeys.tableUsage(),
    enabled,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('analytics')
        .select('event_data, created_at')
        .eq('event_type', 'qr_scan')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const tableCounts = new Map<number, { scans: number; name: string }>();
      (data || []).forEach((item) => {
        const ed = item.event_data as Record<string, unknown> | null;
        if (ed?.table_number) {
          const num = Number(ed.table_number);
          const existing = tableCounts.get(num);
          if (existing) {
            existing.scans++;
          } else {
            tableCounts.set(num, { scans: 1, name: `Table ${num}` });
          }
        }
      });

      return Array.from(tableCounts.entries())
        .map(([num, data]) => ({ table_number: num, ...data }))
        .sort((a, b) => a.table_number - b.table_number);
    },
    staleTime: 60 * 1000,
  });
}

export function useDiningTakeaway(period: string = 'month') {
  const enabled = useAdminQueryEnabled();

  return useQuery({
    queryKey: analyticsKeys.diningTakeaway(period),
    enabled,
    queryFn: async () => {
      const supabase = createClient();
      const { start, end } = getDateRange(period);
      const { data, error } = await supabase
        .from('analytics')
        .select('event_type, created_at')
        .in('event_type', ['dining_order', 'takeaway_order'])
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      let dining = 0;
      let takeaway = 0;
      (data || []).forEach((item) => {
        if (item.event_type === 'dining_order') dining++;
        if (item.event_type === 'takeaway_order') takeaway++;
      });

      return { dining, takeaway, total: dining + takeaway };
    },
    staleTime: 60 * 1000,
  });
}

export function useDeviceBreakdown(period: string = 'month') {
  const enabled = useAdminQueryEnabled();

  return useQuery({
    queryKey: analyticsKeys.devices(period),
    enabled,
    queryFn: async () => {
      const supabase = createClient();
      const { start, end } = getDateRange(period);
      const { data, error } = await supabase
        .from('analytics')
        .select('device_type, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      const deviceCounts = new Map<string, number>();
      (data || []).forEach((item) => {
        const device = item.device_type || 'unknown';
        deviceCounts.set(device, (deviceCounts.get(device) || 0) + 1);
      });

      return Array.from(deviceCounts.entries())
        .map(([device, count]) => ({ device, count }))
        .sort((a, b) => b.count - a.count);
    },
    staleTime: 60 * 1000,
  });
}
