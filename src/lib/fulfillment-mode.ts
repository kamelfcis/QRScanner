export type FulfillmentMode = 'default' | 'delivery_only';

/** When `delivery_only`, welcome shows Delivery only (no dine-in / takeaway picker). */
export function getFulfillmentMode(): FulfillmentMode {
  return process.env.NEXT_PUBLIC_FULFILLMENT_MODE === 'delivery_only' ? 'delivery_only' : 'default';
}

export function isDeliveryOnlyMode(): boolean {
  return getFulfillmentMode() === 'delivery_only';
}
