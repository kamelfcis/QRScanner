'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAdminQueryEnabled } from './useAdminQueryEnabled';
import { getDateRange } from './useAnalytics';
import { computeSalesKpis, type SalesReportKpis } from '@/lib/order/sales-kpis';
import type { Order } from '@/types/database';

export { computeSalesKpis };
export type { SalesReportKpis };

export const salesReportKeys = {
  all: ['sales-report'] as const,
  period: (period: string) => [...salesReportKeys.all, period] as const,
};

export interface SalesReportData {
  orders: Order[];
  kpis: SalesReportKpis;
}

const ORDER_SELECT =
  'id, order_number, status, dining_mode, fulfillment_type, customer_name, customer_phone, discount_amount, coupon_code, total, currency, created_at';

async function fetchOrdersInRange(startIso: string, endIso: string): Promise<Order[]> {
  const supabase = createClient();
  const pageSize = 1000;
  const orders: Order[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const page = (data ?? []) as Order[];
    orders.push(...page);
    if (page.length < pageSize) break;
  }

  return orders;
}

export function useSalesReport(period: string = 'month', options?: { enabled?: boolean }) {
  const adminEnabled = useAdminQueryEnabled();
  const enabled = adminEnabled && options?.enabled !== false;

  return useQuery({
    queryKey: salesReportKeys.period(period),
    enabled,
    queryFn: async (): Promise<SalesReportData> => {
      const { start, end } = getDateRange(period);
      const orders = await fetchOrdersInRange(start.toISOString(), end.toISOString());
      return { orders, kpis: computeSalesKpis(orders) };
    },
    staleTime: 30 * 1000,
  });
}
