export type PrepFulfillmentType = 'pickup' | 'delivery' | 'dining' | null;

export interface EstimateReadyTimeInput {
  itemCount: number;
  fulfillmentType: PrepFulfillmentType;
  /** Restaurant default from settings; falls back to 20 when omitted. */
  basePrepMinutes?: number;
}

export interface ReadyTimeEstimate {
  minMinutes: number;
  maxMinutes: number;
}

const MIN_READY = 20;
const MAX_READY = 35;

/** Simple prep window from fulfillment type + item count (hettsamaka quick win). */
export function estimateReadyTime(input: EstimateReadyTimeInput): ReadyTimeEstimate {
  const base = Math.max(MIN_READY, Math.min(MAX_READY, input.basePrepMinutes ?? 20));
  const items = Math.max(0, Math.min(input.itemCount, 8));
  const itemBump = Math.min(10, items * 2);

  let fulfillmentBump = 0;
  if (input.fulfillmentType === 'delivery') fulfillmentBump = 8;
  else if (input.fulfillmentType === 'pickup') fulfillmentBump = 3;

  const center = Math.min(MAX_READY, base + itemBump + fulfillmentBump);
  const minMinutes = Math.max(MIN_READY, center - 5);
  const maxMinutes = Math.min(MAX_READY, Math.max(minMinutes + 5, center + 3));

  return { minMinutes, maxMinutes };
}

export function formatReadyTimeRange(estimate: ReadyTimeEstimate, locale: string): string {
  const fmt = new Intl.NumberFormat(locale);
  return `${fmt.format(estimate.minMinutes)}–${fmt.format(estimate.maxMinutes)}`;
}
