import { format } from 'date-fns';
import type { Order } from '@/types/database';
import type { ExportData } from '@/types/database';

export interface AccountantExportLabels {
  orderNumber: string;
  date: string;
  customer: string;
  status: string;
  subtotal: string;
  delivery: string;
  discount: string;
  total: string;
}

export function buildAccountantExport(
  orders: Order[],
  labels: AccountantExportLabels,
  filename: string
): ExportData {
  return {
    headers: [
      labels.orderNumber,
      labels.date,
      labels.customer,
      labels.status,
      labels.subtotal,
      labels.delivery,
      labels.discount,
      labels.total,
    ],
    rows: orders.map((order) => [
      order.order_number,
      format(new Date(order.created_at), 'yyyy-MM-dd HH:mm'),
      order.customer_name,
      order.status,
      Number(order.subtotal ?? 0),
      Number(order.delivery_fee ?? 0),
      Number(order.discount_amount ?? 0),
      Number(order.total),
    ]),
    filename,
  };
}

export function monthExportFilename(year: number, month: number): string {
  const mm = String(month).padStart(2, '0');
  return `orders-${year}-${mm}`;
}
