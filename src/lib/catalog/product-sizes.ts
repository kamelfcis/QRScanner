import { hasExtendedProductSizes } from '@/i18n/config';
import type { Locale } from '@/i18n/config';

export type ProductSizeId = 'small' | 'medium' | 'large' | 'family';

export const SIZE_ORDER: ProductSizeId[] = ['small', 'medium', 'large', 'family'];

export interface ProductSizeFields {
  dining_price: number;
  takeaway_price: number;
  price_medium?: number | null;
  price_family?: number | null;
  has_size_options: boolean;
  size_small_enabled?: boolean | null;
  size_medium_enabled?: boolean | null;
  size_large_enabled?: boolean | null;
  size_family_enabled?: boolean | null;
}

export const SIZE_LABELS: Record<Locale, Record<ProductSizeId, string>> = {
  ar: { small: 'صغير', medium: 'وسط', large: 'كبير', family: 'عائلي' },
  en: { small: 'Small', medium: 'Medium', large: 'Large', family: 'Family' },
  fr: { small: 'Petit', medium: 'Moyen', large: 'Grand', family: 'Familial' },
  nl: { small: 'Klein', medium: 'Middel', large: 'Groot', family: 'Familie' },
};

export function isSizeEnabled(product: ProductSizeFields, sizeId: ProductSizeId): boolean {
  if (!product.has_size_options) return false;
  if (!hasExtendedProductSizes) {
    return sizeId === 'small' || sizeId === 'large';
  }
  switch (sizeId) {
    case 'small':
      return product.size_small_enabled !== false;
    case 'medium':
      return product.size_medium_enabled === true;
    case 'large':
      return product.size_large_enabled !== false;
    case 'family':
      return product.size_family_enabled === true;
    default:
      return false;
  }
}

export function getEnabledProductSizes(product: ProductSizeFields): ProductSizeId[] {
  if (!product.has_size_options) return [];
  if (!hasExtendedProductSizes) return ['small', 'large'];
  return SIZE_ORDER.filter((sizeId) => isSizeEnabled(product, sizeId));
}

export function getProductSizePrice(product: ProductSizeFields, sizeId: ProductSizeId): number {
  switch (sizeId) {
    case 'small':
      return product.dining_price;
    case 'medium':
      return product.price_medium ?? 0;
    case 'large':
      return product.takeaway_price;
    case 'family':
      return product.price_family ?? 0;
  }
}

export function getProductSizePriceRange(
  product: ProductSizeFields
): { min: number; max: number } | null {
  const enabled = getEnabledProductSizes(product);
  if (!enabled.length) return null;
  const prices = enabled.map((sizeId) => getProductSizePrice(product, sizeId));
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function isValidProductSizeSelection(
  product: ProductSizeFields,
  sizeId: ProductSizeId | null | undefined
): boolean {
  if (!product.has_size_options) return sizeId == null;
  if (sizeId == null) return false;
  if (!isSizeEnabled(product, sizeId)) return false;
  const price = getProductSizePrice(product, sizeId);
  return Number.isFinite(price) && price >= 0;
}

export function getDefaultProductSize(product: ProductSizeFields): ProductSizeId | null {
  const enabled = getEnabledProductSizes(product);
  return enabled[0] ?? null;
}

export function getSizeLabel(locale: Locale, sizeId: ProductSizeId): string {
  return SIZE_LABELS[locale][sizeId];
}
