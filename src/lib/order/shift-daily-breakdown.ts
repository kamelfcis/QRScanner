import type { Order, OrderItem, OrderWithItems } from '@/types/database';
import type { PaymentMethod } from '@/lib/order/payment-close';

export interface DailyOpsBreakdown {
  onlineOrderCount: number;
  cashierOrderCount: number;
  cashTotal: number;
  cardTotal: number;
  instapayTotal: number;
  voidTotal: number;
  voidCount: number;
  refundTotal: number;
  refundCount: number;
  grossRevenue: number;
  netRevenue: number;
}

export function sumVoidedItems(items: OrderItem[]): number {
  return items.reduce((sum, item) => {
    if (!item.voided_at) return sum;
    return sum + Number(item.unit_price) * item.quantity;
  }, 0);
}

export function computeDailyOpsBreakdown(
  orders: Order[],
  orderItemsByOrderId: Map<string, OrderItem[]>,
  expenseTotal = 0
): DailyOpsBreakdown {
  let onlineOrderCount = 0;
  let cashierOrderCount = 0;
  let cashTotal = 0;
  let cardTotal = 0;
  let instapayTotal = 0;
  let voidTotal = 0;
  let voidCount = 0;
  let refundTotal = 0;
  let refundCount = 0;
  let grossRevenue = 0;

  for (const order of orders) {
    if (order.refunded_at) {
      refundTotal += Number(order.total);
      refundCount += 1;
      grossRevenue += Number(order.total);

      const isCashier =
        order.order_channel === 'cashier' ||
        (order.order_channel == null && Boolean(order.payment_method));
      if (isCashier) cashierOrderCount += 1;
      else onlineOrderCount += 1;

      if (order.payment_method) {
        const method = order.payment_method as PaymentMethod;
        const tender = Number(order.total);
        if (method === 'cash') cashTotal += tender;
        else if (method === 'card') cardTotal += tender;
        else if (method === 'instapay') instapayTotal += tender;
      }
      continue;
    }

    if (order.status === 'cancelled') {
      if (order.void_reason) {
        voidTotal += Number(order.total);
        voidCount += 1;
      }
      continue;
    }

    const items = orderItemsByOrderId.get(order.id) ?? [];
    const voidedLineTotal = sumVoidedItems(items);
    voidTotal += voidedLineTotal;
    voidCount += items.filter((item) => item.voided_at).length;

    grossRevenue += Math.max(0, Number(order.total) - voidedLineTotal);

    const isCashier =
      order.order_channel === 'cashier' ||
      (order.order_channel == null && Boolean(order.payment_method));
    if (isCashier) cashierOrderCount += 1;
    else onlineOrderCount += 1;

    if (order.payment_method) {
      const method = order.payment_method as PaymentMethod;
      const tender = Math.max(0, Number(order.total) - voidedLineTotal);
      if (method === 'cash') cashTotal += tender;
      else if (method === 'card') cardTotal += tender;
      else if (method === 'instapay') instapayTotal += tender;
    }
  }

  const netRevenue = grossRevenue - refundTotal - expenseTotal;

  return {
    onlineOrderCount,
    cashierOrderCount,
    cashTotal,
    cardTotal,
    instapayTotal,
    voidTotal,
    voidCount,
    refundTotal,
    refundCount,
    grossRevenue,
    netRevenue,
  };
}

export function buildOrderItemsMap(orders: OrderWithItems[]): Map<string, OrderItem[]> {
  const map = new Map<string, OrderItem[]>();
  for (const order of orders) {
    map.set(order.id, order.items);
  }
  return map;
}
