'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAdminQueryEnabled } from './useAdminQueryEnabled';
import { orderKeys } from './useOrders';
import type { OrderItem, OrderWithItems } from '@/types/database';
import type { StaffPlaceOrderInput } from '@/types/schema';

const supabase = createClient();

export const staffOrderCatalogKeys = {
  all: ['staff-order-catalog'] as const,
};

export interface StaffCatalogProduct {
  id: string;
  category_id: string;
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
  is_available: boolean;
  sort_order: number;
}

export interface StaffCatalogCategory {
  id: string;
  name_ar: string;
  name_en: string;
  name_fr: string | null;
  name_nl: string | null;
  sort_order: number;
  is_visible: boolean;
  products: StaffCatalogProduct[];
}

const STAFF_CATALOG_SELECT = `
  id, name_ar, name_en, name_fr, name_nl, sort_order, is_visible,
  products:products!category_id(
    id, category_id, name_ar, name_en, name_fr, name_nl, image_url,
    dining_price, takeaway_price, has_size_options, price_per_kg,
    weight_options_g, is_available, sort_order
  )
`;

type RawOrderItem = OrderItem & {
  products?: { image_url: string | null } | null;
};

function normalizeOrderItem(item: RawOrderItem): OrderItem {
  const { products, ...rest } = item;
  return { ...rest, image_url: products?.image_url ?? null };
}

export function useStaffOrderCatalog() {
  const enabled = useAdminQueryEnabled();

  return useQuery({
    queryKey: staffOrderCatalogKeys.all,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select(STAFF_CATALOG_SELECT)
        .eq('is_visible', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return (data ?? []).map((row) => ({
        ...row,
        products: (row.products ?? [])
          .filter((p: StaffCatalogProduct) => p.is_available)
          .sort(
            (a: StaffCatalogProduct, b: StaffCatalogProduct) =>
              a.sort_order - b.sort_order || a.name_en.localeCompare(b.name_en)
          ),
      })) as StaffCatalogCategory[];
    },
    staleTime: 60_000,
  });
}

export async function fetchStaffOrderForReceipt(orderId: string): Promise<OrderWithItems> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, products(image_url))')
    .eq('id', orderId)
    .single();

  if (error) throw error;

  const { order_items, ...order } = data as typeof data & { order_items?: RawOrderItem[] };
  return {
    ...order,
    items: (order_items ?? []).map(normalizeOrderItem),
  } as OrderWithItems;
}

export interface StaffPlaceOrderResult {
  id: string;
  order_number: string;
  subtotal: number;
  tax: number;
  service: number;
  discount_amount?: number;
  coupon_code?: string | null;
  delivery_fee?: number;
  total: number;
  currency: string;
}

export function usePlaceStaffOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: StaffPlaceOrderInput) => {
      const res = await fetch('/api/orders/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const body = (await res.json().catch(() => ({}))) as StaffPlaceOrderResult & {
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        throw new Error(body.code ?? body.error ?? 'place_failed');
      }
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}
