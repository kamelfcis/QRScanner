'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAdminQueryEnabled } from './useAdminQueryEnabled';
import { getDateRange } from './useAnalytics';
import { computeSalesKpis, type SalesReportKpis } from '@/lib/order/sales-kpis';
import {
  resolveCustomSalesBounds,
  type SalesReportBoundsResult,
  type SalesReportPeriod,
} from '@/lib/order/sales-range';
import type { Order } from '@/types/database';

export { computeSalesKpis };
export type { SalesReportKpis };
export type { SalesReportPeriod };

export const salesReportKeys = {
  all: ['sales-report'] as const,
  range: (startIso: string, endIso: string) => [...salesReportKeys.all, startIso, endIso] as const,
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

export function resolveSalesReportBounds(
  period: SalesReportPeriod,
  from?: string,
  to?: string
): SalesReportBoundsResult {
  if (period !== 'custom') {
    const { start, end } = getDateRange(period);
    return { ok: true, start, end };
  }
  return resolveCustomSalesBounds(from, to);
}

export function useSalesReport(
  period: SalesReportPeriod = 'today',
  options?: { enabled?: boolean; from?: string; to?: string }
) {
  const adminEnabled = useAdminQueryEnabled();
  const bounds = resolveSalesReportBounds(period, options?.from, options?.to);
  const startIso = bounds.ok ? bounds.start.toISOString() : 'invalid';
  const endIso = bounds.ok ? bounds.end.toISOString() : 'invalid';
  const enabled = adminEnabled && options?.enabled !== false && bounds.ok;

  const query = useQuery({
    queryKey: salesReportKeys.range(startIso, endIso),
    enabled,
    queryFn: async (): Promise<SalesReportData> => {
      const orders = await fetchOrdersInRange(startIso, endIso);
      return { orders, kpis: computeSalesKpis(orders) };
    },
    staleTime: 30 * 1000,
  });

  return { ...query, bounds };
}
