import type { CartItem } from '@/stores/cart-store';
import type { Product } from '@/types/database';
import type { LastOrderLineItem } from '@/lib/order/last-order';

export type RepeatCartPayload = Omit<CartItem, 'id' | 'quantity'> & { quantity: number };

export interface RepeatLastOrderResult {
  added: RepeatCartPayload[];
  skippedUnavailable: LastOrderLineItem[];
  skippedMissing: LastOrderLineItem[];
}

function productMap(products: Product[]): Map<string, Product> {
  return new Map(products.map((p) => [p.id, p]));
}

function toCartItem(
  line: LastOrderLineItem,
  product: Product
): Omit<CartItem, 'id' | 'quantity'> & {
  quantity: number;
} {
  return {
    productId: line.productId,
    name_en: product.name_en,
    name_ar: product.name_ar,
    name_fr: product.name_fr,
    name_nl: product.name_nl,
    image_url: product.image_url,
    dining_price: Number(product.dining_price),
    takeaway_price: Number(product.takeaway_price),
    has_size_options: product.has_size_options,
    price_per_kg: product.price_per_kg != null ? Number(product.price_per_kg) : null,
    weight_options_g: product.weight_options_g ?? null,
    sizeOption: line.sizeOption,
    weightGrams: line.weightGrams ?? null,
    quantity: line.quantity,
    notes: line.notes,
  };
}

/** Rebuild cart lines from a snapshot; skips unavailable or removed products. */
export function buildRepeatCartItems(
  lines: LastOrderLineItem[] | undefined,
  catalogProducts: Product[]
): RepeatLastOrderResult {
  const byId = productMap(catalogProducts);
  const added: RepeatCartPayload[] = [];
  const skippedUnavailable: LastOrderLineItem[] = [];
  const skippedMissing: LastOrderLineItem[] = [];

  for (const line of lines ?? []) {
    const product = byId.get(line.productId);
    if (!product) {
      skippedMissing.push(line);
      continue;
    }
    if (!product.is_available) {
      skippedUnavailable.push(line);
      continue;
    }
    added.push(toCartItem(line, product));
  }

  return { added, skippedUnavailable, skippedMissing };
}

export function hasRepeatableLastOrder(
  snapshot: { items?: LastOrderLineItem[]; phone?: string | null; orderNumber?: string } | null
): boolean {
  if (!snapshot) return false;
  const hasIdentity = Boolean(snapshot.orderNumber?.trim() || snapshot.phone?.trim());
  const hasItems = (snapshot.items?.length ?? 0) > 0;
  return hasIdentity && hasItems;
}
