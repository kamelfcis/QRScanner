import type { QueryClient } from '@tanstack/react-query';
import { calculateOrderTotals } from '@/lib/order/totals';
import { computeWeightPrice, hasWeightOptions } from '@/lib/order/weight-price';
import { orderKeys } from '@/lib/order/query-keys';
import type { OrderItem, OrderStatus, OrderWithItems, RestaurantSettings } from '@/types/database';
import type { StaffPlaceOrderInput } from '@/types/schema';
import { isOfflineTempOrderId } from './types';

const RESTAURANT_SETTINGS_KEY = ['settings', 'restaurant'] as const;
const STAFF_CATALOG_KEY_PREFIX = 'staff-order-catalog';

interface CatalogProduct {
  id: string;
  name_ar: string;
  name_en: string;
  name_fr: string | null;
  name_nl: string | null;
  image_url: string | null;
  dining_price: number;
  takeaway_price: number;
  has_size_options: boolean;
  price_per_kg: number | null;
  weight_options_g: number[] | null;
}

function patchOrdersCache(
  queryClient: QueryClient,
  updater: (orders: OrderWithItems[]) => OrderWithItems[]
): void {
  queryClient.setQueryData<OrderWithItems[]>(orderKeys.lists(), (current) =>
    updater(current ?? [])
  );
}

export function patchOrderStatus(
  queryClient: QueryClient,
  orderId: string,
  status: OrderStatus
): void {
  patchOrdersCache(queryClient, (orders) =>
    orders.map((order) =>
      order.id === orderId ? { ...order, status, updated_at: new Date().toISOString() } : order
    )
  );
}

export function patchAcknowledgeOrder(queryClient: QueryClient, orderId: string): void {
  const now = new Date().toISOString();
  patchOrdersCache(queryClient, (orders) =>
    orders.map((order) =>
      order.id === orderId ? { ...order, staff_acknowledged_at: now, updated_at: now } : order
    )
  );
}

export function patchDeliveryFee(
  queryClient: QueryClient,
  orderId: string,
  delivery_fee: number
): void {
  patchOrdersCache(queryClient, (orders) =>
    orders.map((order) => {
      if (order.id !== orderId) return order;
      const feeDelta = delivery_fee - Number(order.delivery_fee ?? 0);
      return {
        ...order,
        delivery_fee,
        total: Math.round((Number(order.total) + feeDelta) * 100) / 100,
        updated_at: new Date().toISOString(),
      };
    })
  );
}

function findCatalogProduct(queryClient: QueryClient, productId: string): CatalogProduct | null {
  const queries = queryClient.getQueriesData<Array<{ products: CatalogProduct[] }>>({
    queryKey: [STAFF_CATALOG_KEY_PREFIX],
  });

  for (const [, data] of queries) {
    if (!data) continue;
    for (const category of data) {
      const product = category.products?.find((p) => p.id === productId);
      if (product) return product;
    }
  }
  return null;
}

function lineUnitPrice(
  product: CatalogProduct,
  diningMode: StaffPlaceOrderInput['dining_mode'],
  sizeOption: StaffPlaceOrderInput['items'][number]['size_option'],
  weightGrams: number | null | undefined
): number {
  if (weightGrams != null && hasWeightOptions(product)) {
    return computeWeightPrice(Number(product.price_per_kg), weightGrams);
  }
  const base = diningMode === 'takeaway' ? product.takeaway_price : product.dining_price;
  if (product.has_size_options && sizeOption === 'small') {
    return Math.round(base * 0.75 * 100) / 100;
  }
  return base;
}

function buildTempOrderNumber(): string {
  return `OFF-${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

export function buildOptimisticStaffOrder(
  queryClient: QueryClient,
  input: StaffPlaceOrderInput,
  tempOrderId: string
): OrderWithItems {
  const settings = queryClient.getQueryData<RestaurantSettings>(RESTAURANT_SETTINGS_KEY) ?? null;
  const currency = settings?.currency ?? 'EGP';
  const now = new Date().toISOString();

  const items: OrderItem[] = input.items.map((line, index) => {
    const product = findCatalogProduct(queryClient, line.product_id);
    const unit_price = product
      ? lineUnitPrice(product, input.dining_mode, line.size_option, line.weight_grams)
      : 0;

    return {
      id: `${tempOrderId}-item-${index}`,
      order_id: tempOrderId,
      product_id: line.product_id,
      name_ar: product?.name_ar ?? '—',
      name_en: product?.name_en ?? '—',
      name_fr: product?.name_fr ?? null,
      name_nl: product?.name_nl ?? null,
      quantity: line.quantity,
      unit_price,
      size_option: line.size_option ?? null,
      weight_grams: line.weight_grams ?? null,
      notes: line.notes ?? null,
      created_at: now,
      image_url: product?.image_url ?? null,
    };
  });

  const totals = calculateOrderTotals(
    items.map((item) => ({ quantity: item.quantity, unitPrice: item.unit_price })),
    settings,
    null,
    0
  );

  return {
    id: tempOrderId,
    order_number: buildTempOrderNumber(),
    status: 'new',
    dining_mode: input.dining_mode,
    fulfillment_type: input.fulfillment_type ?? null,
    table_number: input.table_number ?? null,
    customer_name: input.customer_name,
    customer_phone: input.customer_phone ?? null,
    delivery_address: input.delivery_address_details ?? null,
    delivery_location_id: input.delivery_location_id ?? null,
    notes: input.notes ?? null,
    subtotal: totals.subtotal,
    tax: totals.tax,
    service: totals.service,
    discount_amount: totals.discount,
    coupon_id: null,
    coupon_code: input.coupon_code ?? null,
    delivery_fee: totals.deliveryFee,
    total: totals.total,
    currency,
    whatsapp_sent: false,
    ready_whatsapp_sent_at: null,
    staff_acknowledged_at: null,
    locale: input.locale ?? 'ar',
    created_at: now,
    updated_at: now,
    items,
  };
}

export function insertTempStaffOrder(queryClient: QueryClient, order: OrderWithItems): void {
  patchOrdersCache(queryClient, (orders) => [order, ...orders]);
}

export function replaceTempStaffOrder(
  queryClient: QueryClient,
  tempOrderId: string,
  serverOrder: OrderWithItems
): void {
  patchOrdersCache(queryClient, (orders) =>
    orders.map((order) => (order.id === tempOrderId ? serverOrder : order))
  );
}

export function markTempStaffOrderFailed(queryClient: QueryClient, tempOrderId: string): void {
  patchOrdersCache(queryClient, (orders) =>
    orders.map((order) =>
      order.id === tempOrderId
        ? {
            ...order,
            notes: order.notes ? `${order.notes} [sync-failed]` : '[sync-failed]',
          }
        : order
    )
  );
}

export function isSyncFailedOrder(order: OrderWithItems): boolean {
  return isOfflineTempOrderId(order.id) && (order.notes?.includes('[sync-failed]') ?? false);
}
