import { hasDynamicProductSizes } from '@/i18n/config';

export interface EcommerceProductSize {
  id?: string;
  product_id?: string;
  sort_order: number;
  code: string;
  label_ar: string;
  label_en: string;
  price: number;
  is_enabled: boolean;
  is_sold_out: boolean;
}

export interface SelectedSizeSnapshot {
  code: string;
  label_ar: string;
  label_en: string;
  price: number;
}

export const PRESET_SIZE_CODES = ['s', 'm', 'l', 'xl'] as const;
export type PresetSizeCode = (typeof PRESET_SIZE_CODES)[number];

export const PRESET_SIZE_DEFAULTS: Record<
  PresetSizeCode,
  { label_en: string; label_ar: string; sort_order: number }
> = {
  s: { label_en: 'Small', label_ar: 'صغير', sort_order: 0 },
  m: { label_en: 'Medium', label_ar: 'وسط', sort_order: 1 },
  l: { label_en: 'Large', label_ar: 'كبير', sort_order: 2 },
  xl: { label_en: 'Extra Large', label_ar: 'إكس لارج', sort_order: 3 },
};

export function isPresetSizeCode(code: string): code is PresetSizeCode {
  return (PRESET_SIZE_CODES as readonly string[]).includes(code);
}

export function createDefaultSizeRows(basePrice = 0): EcommerceProductSize[] {
  return PRESET_SIZE_CODES.map((code) => ({
    sort_order: PRESET_SIZE_DEFAULTS[code].sort_order,
    code,
    label_ar: PRESET_SIZE_DEFAULTS[code].label_ar,
    label_en: PRESET_SIZE_DEFAULTS[code].label_en,
    price: basePrice,
    is_enabled: false,
    is_sold_out: false,
  }));
}

export function mergeSizeRows(
  existing: EcommerceProductSize[],
  basePrice = 0
): EcommerceProductSize[] {
  const preset = createDefaultSizeRows(basePrice).map((row) => {
    const found = existing.find((item) => item.code === row.code);
    return found ? { ...row, ...found, code: row.code } : row;
  });
  const custom = existing
    .filter((item) => !isPresetSizeCode(item.code))
    .sort((a, b) => a.sort_order - b.sort_order);
  return [...preset, ...custom];
}

export function getEnabledSizes(
  sizes: EcommerceProductSize[] | null | undefined
): EcommerceProductSize[] {
  return (sizes ?? [])
    .filter((size) => size.is_enabled)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function getPurchasableSizes(
  sizes: EcommerceProductSize[] | null | undefined
): EcommerceProductSize[] {
  return getEnabledSizes(sizes).filter((size) => !size.is_sold_out);
}

export function requiresSizeSelection(sizes: EcommerceProductSize[] | null | undefined): boolean {
  return getEnabledSizes(sizes).length > 0;
}

function isTrackedStock(stockQty: number | null | undefined): stockQty is number {
  return typeof stockQty === 'number' && Number.isFinite(stockQty);
}

export function isProductEffectivelySoldOut(
  isAvailable: boolean,
  sizes: EcommerceProductSize[] | null | undefined,
  stockQty?: number | null
): boolean {
  if (!isAvailable) return true;
  if (isTrackedStock(stockQty) && stockQty <= 0) return true;
  const enabled = getEnabledSizes(sizes);
  if (!enabled.length) return false;
  return enabled.every((size) => size.is_sold_out);
}

/** Inclusive max for a quantity control. Null means stock is not tracked. */
export function stockQuantityCap(stockQty: number | null | undefined): number | null {
  if (!isTrackedStock(stockQty)) return null;
  return Math.max(0, Math.floor(stockQty));
}

/** Units already allocated elsewhere. Null when this line is not capped. */
export function maxAddableQuantity(
  stockQty: number | null | undefined,
  alreadyAllocated: number
): number | null {
  const cap = stockQuantityCap(stockQty);
  if (cap == null) return null;
  const used = Number.isFinite(alreadyAllocated) ? Math.max(0, Math.floor(alreadyAllocated)) : 0;
  return Math.max(0, cap - used);
}

/** "Only N left" for 1–5. Null when stock is unlimited, zero, or above 5. */
export function lowStockLabelCount(stockQty: number | null | undefined): number | null {
  const cap = stockQuantityCap(stockQty);
  if (cap == null || cap < 1 || cap > 5) return null;
  return cap;
}

export function exceedsTrackedStock(
  stockQty: number | null | undefined,
  requestedQty: number
): boolean {
  if (!isTrackedStock(stockQty)) return false;
  return requestedQty > stockQty;
}

export function getSizeByCode(
  sizes: EcommerceProductSize[] | null | undefined,
  code: string | null | undefined
): EcommerceProductSize | null {
  if (!code) return null;
  return (sizes ?? []).find((size) => size.code === code) ?? null;
}

export function isValidSizeSelection(
  sizes: EcommerceProductSize[] | null | undefined,
  code: string | null | undefined
): boolean {
  if (!requiresSizeSelection(sizes)) return code == null;
  const size = getSizeByCode(sizes, code);
  if (!size || !size.is_enabled || size.is_sold_out) return false;
  return Number.isFinite(size.price) && size.price >= 0;
}

export function getDefaultPurchasableSize(
  sizes: EcommerceProductSize[] | null | undefined
): EcommerceProductSize | null {
  return getPurchasableSizes(sizes)[0] ?? null;
}

export function getSizeLabel(
  size: Pick<EcommerceProductSize, 'label_en' | 'label_ar'>,
  locale: string
): string {
  return locale === 'ar' ? size.label_ar || size.label_en : size.label_en || size.label_ar;
}

export function toSelectedSizeSnapshot(size: EcommerceProductSize): SelectedSizeSnapshot {
  return {
    code: size.code,
    label_ar: size.label_ar,
    label_en: size.label_en,
    price: size.price,
  };
}

export function getSizePriceRange(
  sizes: EcommerceProductSize[] | null | undefined
): { min: number; max: number } | null {
  const enabled = getEnabledSizes(sizes);
  if (!enabled.length) return null;
  const prices = enabled.map((size) => size.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function syncProductBasePricesFromSizes(
  sizes: EcommerceProductSize[]
): { dining_price: number; takeaway_price: number } | null {
  const enabled = getEnabledSizes(sizes);
  if (!enabled.length) return null;
  const min = Math.min(...enabled.map((size) => size.price));
  return { dining_price: min, takeaway_price: min };
}

export function getEcommerceUnitPrice(
  sizes: EcommerceProductSize[] | null | undefined,
  sizeCode: string | null | undefined,
  fallbackPrice: number
): number {
  if (!requiresSizeSelection(sizes)) return fallbackPrice;
  const size = getSizeByCode(sizes, sizeCode);
  if (!size || !size.is_enabled || size.is_sold_out) return fallbackPrice;
  return size.price;
}

export function validateSizeRowsForSave(rows: EcommerceProductSize[]): string | null {
  const enabled = rows.filter((row) => row.is_enabled);
  for (const row of enabled) {
    if (!row.label_en.trim() || !row.label_ar.trim()) {
      return 'Enabled sizes require labels in both languages';
    }
    if (!Number.isFinite(row.price) || row.price < 0) {
      return 'Enabled sizes require a valid price';
    }
    if (!row.code.trim()) {
      return 'Each size requires a code';
    }
  }

  const codes = rows.map((row) => row.code.trim().toLowerCase());
  const unique = new Set(codes);
  if (unique.size !== codes.length) {
    return 'Duplicate size codes are not allowed';
  }

  const customRows = rows.filter((row) => !isPresetSizeCode(row.code));
  if (customRows.length > 1) {
    return 'Only one custom size is allowed';
  }

  return null;
}

/** Cart line id suffix for size variants. */
export function sizeCartKey(sizeCode: string | null | undefined): string {
  return sizeCode ? `size:${sizeCode}` : '';
}

export function usesDynamicProductSizes(sizes: EcommerceProductSize[] | null | undefined): boolean {
  return hasDynamicProductSizes && requiresSizeSelection(sizes);
}
