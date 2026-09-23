'use client';

import { useMemo } from 'react';
import { useOrders } from '@/hooks/useOrders';

export interface TableOccupancy {
  tableNumber: string;
  orderId: string;
  orderNumber: string;
}

export function useTableOccupancy() {
  const { data: orders, ...rest } = useOrders();

  const occupancyByTable = useMemo(() => {
    const map = new Map<string, TableOccupancy>();
    for (const order of orders ?? []) {
      if (order.dining_mode !== 'dining') continue;
      if (order.status === 'completed' || order.status === 'cancelled') continue;
      const tableNumber = order.table_number?.trim();
      if (!tableNumber) continue;
      if (!map.has(tableNumber)) {
        map.set(tableNumber, {
          tableNumber,
          orderId: order.id,
          orderNumber: order.order_number,
        });
      }
    }
    return map;
  }, [orders]);

  return { occupancyByTable, ...rest };
}
