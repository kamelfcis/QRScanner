import type { Order } from '@/types/database';

export interface SalesReportKpis {
  orderCount: number;
  revenue: number;
  discounts: number;
  averageOrderValue: number;
  deliveryCount: number;
}

export function computeSalesKpis(orders: Order[]): SalesReportKpis {
  const billable = orders.filter((order) => order.status !== 'cancelled');
  const revenue = billable.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const discounts = billable.reduce((sum, order) => sum + Number(order.discount_amount || 0), 0);
  const deliveryCount = billable.filter((order) => order.fulfillment_type === 'delivery').length;

  return {
    orderCount: orders.length,
    revenue,
    discounts,
    averageOrderValue: billable.length > 0 ? revenue / billable.length : 0,
    deliveryCount,
  };
}
