'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import type { AnalyticsSummary, TopItem, SearchTerm, PeakHour, TableUsage } from '@/types/database';

const supabase = createClient();

export const analyticsKeys = {
  all: ['analytics'] as const,
  summary: (period: string) => [...analyticsKeys.all, 'summary', period] as const,
  topProducts: (period: string) => [...analyticsKeys.all, 'top-products', period] as const,
  topCategories: (period: string) => [...analyticsKeys.all, 'top-categories', period] as const,
  searchTerms: (period: string) => [...analyticsKeys.all, 'search-terms', period] as const,
  peakHours: (period: string) => [...analyticsKeys.all, 'peak-hours', period] as const,
  peakDays: (period: string) => [...analyticsKeys.all, 'peak-days', period] as const,
  tableUsage: () => [...analyticsKeys.all, 'table-usage'] as const,
  diningTakeaway: (period: string) => [...analyticsKeys.all, 'dining-takeaway', period] as const,
  devices: (period: string) => [...analyticsKeys.all, 'devices', period] as const,
};

function getDateRange(period: string) {
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
  return useQuery({
    queryKey: analyticsKeys.summary(period),
    queryFn: async () => {
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

export function useTopProducts(period: string = 'month', limit: number = 10) {
  return useQuery({
    queryKey: analyticsKeys.topProducts(period),
    queryFn: async () => {
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
  return useQuery({
    queryKey: analyticsKeys.topCategories(period),
    queryFn: async () => {
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
  return useQuery({
    queryKey: analyticsKeys.searchTerms(period),
    queryFn: async () => {
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
  return useQuery({
    queryKey: analyticsKeys.peakHours(period),
    queryFn: async () => {
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
  return useQuery({
    queryKey: analyticsKeys.peakDays(period),
    queryFn: async () => {
      const { start, end } = getDateRange(period);
      const { data, error } = await supabase
        .from('analytics')
        .select('created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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
  return useQuery({
    queryKey: analyticsKeys.tableUsage(),
    queryFn: async () => {
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
  return useQuery({
    queryKey: analyticsKeys.diningTakeaway(period),
    queryFn: async () => {
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
  return useQuery({
    queryKey: analyticsKeys.devices(period),
    queryFn: async () => {
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
