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
  grossRevenue: number;
  netRevenue: number;
}

function lineTotal(item: Pick<OrderItem, 'quantity' | 'unit_price' | 'voided_at'>): number {
  if (item.voided_at) return 0;
  return Number(item.unit_price) * item.quantity;
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
  let grossRevenue = 0;

  for (const order of orders) {
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

    grossRevenue += Number(order.total);

    if (order.payment_method) {
      cashierOrderCount += 1;
      const method = order.payment_method as PaymentMethod;
      if (method === 'cash') cashTotal += Number(order.total);
      else if (method === 'card') cardTotal += Number(order.total);
      else if (method === 'instapay') instapayTotal += Number(order.total);
    } else {
      onlineOrderCount += 1;
    }
  }

  const netRevenue = grossRevenue - voidTotal - expenseTotal;

  return {
    onlineOrderCount,
    cashierOrderCount,
    cashTotal,
    cardTotal,
    instapayTotal,
    voidTotal,
    voidCount,
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
