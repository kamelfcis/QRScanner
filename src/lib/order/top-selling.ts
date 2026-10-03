export interface TopSellingRow {
  product_id: string;
  quantity: number;
}

export interface TopSellingProduct extends TopSellingRow {
  name_en: string;
  name_ar: string;
  name_fr: string | null;
  name_nl: string | null;
}

export const DEFAULT_TOP_SELLING_DAYS = 30;
export const DEFAULT_TOP_SELLING_LIMIT = 5;
export const TOP_SELLING_BADGE_LIMIT = 10;

/** Aggregate raw order-item rows into ranked top sellers (non-cancelled orders only). */
export function aggregateTopSelling(
  rows: TopSellingRow[],
  limit = DEFAULT_TOP_SELLING_LIMIT
): TopSellingRow[] {
  const totals = new Map<string, number>();

  for (const row of rows) {
    if (!row.product_id || row.quantity <= 0) continue;
    totals.set(row.product_id, (totals.get(row.product_id) ?? 0) + row.quantity);
  }

  return [...totals.entries()]
    .map(([product_id, quantity]) => ({ product_id, quantity }))
    .sort((a, b) => b.quantity - a.quantity || a.product_id.localeCompare(b.product_id))
    .slice(0, limit);
}

export function isTopSellingProduct(productId: string, topIds: readonly string[]): boolean {
  return topIds.includes(productId);
}
