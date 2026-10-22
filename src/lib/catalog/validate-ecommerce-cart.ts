import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getEcommerceUnitPrice,
  getSizeByCode,
  isProductEffectivelySoldOut,
  isValidSizeSelection,
  requiresSizeSelection,
  type EcommerceProductSize,
  type SelectedSizeSnapshot,
  toSelectedSizeSnapshot,
} from './ecommerce-sizes';

export interface EcommerceCartValidationItem {
  productId: string;
  quantity: number;
  sizeCode?: string | null;
  notes?: string | null;
}

export interface ValidatedEcommerceCartLine {
  productId: string;
  quantity: number;
  unitPrice: number;
  sizeCode: string | null;
  selectedSize: SelectedSizeSnapshot | null;
  notes: string | null;
  name_en: string;
  name_ar: string;
}

export type EcommerceCartValidationCode =
  'product_not_found' | 'product_unavailable' | 'size_required' | 'size_invalid' | 'size_sold_out';

export interface EcommerceCartValidationResult {
  valid: boolean;
  codes: EcommerceCartValidationCode[];
  items: ValidatedEcommerceCartLine[];
}

type ProductRow = {
  id: string;
  name_en: string;
  name_ar: string;
  dining_price: number;
  takeaway_price: number;
  is_available: boolean;
  product_sizes: EcommerceProductSize[] | null;
};

export async function validateEcommerceCartItems(
  supabase: SupabaseClient,
  items: EcommerceCartValidationItem[],
  options?: { priceBasis?: 'dining' | 'takeaway' }
): Promise<EcommerceCartValidationResult> {
  const codes = new Set<EcommerceCartValidationCode>();
  const validated: ValidatedEcommerceCartLine[] = [];

  if (!items.length) {
    return { valid: true, codes: [], items: [] };
  }

  const productIds = [...new Set(items.map((item) => item.productId))];
  const { data, error } = await supabase
    .from('products')
    .select(
      `
      id, name_en, name_ar, dining_price, takeaway_price, is_available,
      product_sizes:product_sizes(
        id, product_id, sort_order, code, label_ar, label_en, price, is_enabled, is_sold_out
      )
    `
    )
    .in('id', productIds);

  if (error) throw error;

  const byId = new Map((data as ProductRow[] | null)?.map((row) => [row.id, row]) ?? []);

  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) {
      codes.add('product_not_found');
      continue;
    }

    const sizes = product.product_sizes ?? [];
    if (isProductEffectivelySoldOut(product.is_available, sizes)) {
      codes.add('product_unavailable');
      continue;
    }

    const sizeCode = item.sizeCode?.trim() || null;
    if (requiresSizeSelection(sizes) && !sizeCode) {
      codes.add('size_required');
      continue;
    }

    if (!isValidSizeSelection(sizes, sizeCode)) {
      const size = getSizeByCode(sizes, sizeCode);
      if (size?.is_sold_out) codes.add('size_sold_out');
      else codes.add('size_invalid');
      continue;
    }

    const fallback =
      options?.priceBasis === 'takeaway'
        ? (product.takeaway_price ?? product.dining_price ?? 0)
        : (product.dining_price ?? product.takeaway_price ?? 0);
    const unitPrice = getEcommerceUnitPrice(sizes, sizeCode, fallback);
    const selectedSize = sizeCode ? toSelectedSizeSnapshot(getSizeByCode(sizes, sizeCode)!) : null;

    validated.push({
      productId: product.id,
      quantity: Math.max(1, item.quantity),
      unitPrice,
      sizeCode,
      selectedSize,
      notes: item.notes?.trim() || null,
      name_en: product.name_en,
      name_ar: product.name_ar,
    });
  }

  return {
    valid: codes.size === 0 && validated.length === items.length,
    codes: [...codes],
    items: validated,
  };
}
