'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAdminQueryEnabled } from './useAdminQueryEnabled';

const supabase = createClient();

export interface PosSalesOrderRow {
  id: string;
  order_number: string;
  created_at: string;
  customer_name: string;
  status: string;
  sell_total: number;
  cost_total: number;
  margin: number;
}

export interface PosSalesProductRow {
  product_id: string;
  name_en: string;
  name_ar: string;
  qty_sold: number;
  sell_total: number;
  cost_total: number;
  margin: number;
}

export interface PosSalesReport {
  profit: number;
  orders: PosSalesOrderRow[];
  products: PosSalesProductRow[];
}

export function usePosSalesReport(fromIso: string, toIso: string, enabled = true) {
  const adminEnabled = useAdminQueryEnabled();
  return useQuery({
    queryKey: ['pos-sales-report', fromIso, toIso],
    enabled: adminEnabled && enabled && Boolean(fromIso && toIso),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('pos_sales_report', {
        p_from: fromIso,
        p_to: toIso,
      });
      if (error) throw error;
      return data as PosSalesReport;
    },
    staleTime: 60_000,
  });
}
