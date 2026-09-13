export type FulfillmentMode = 'default' | 'delivery_only';

const RESTAURANT_TENANTS = new Set(['aklet', 'warda', 'goldensand', 'hettsamaka']);

function readPublicIdentity(): string {
  return [
    process.env.NEXT_PUBLIC_TENANT,
    process.env.NEXT_PUBLIC_APP_NAME,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function isExplicitRestaurantTenant(): boolean {
  const tenant = (process.env.NEXT_PUBLIC_TENANT || '').trim().toLowerCase();
  return RESTAURANT_TENANTS.has(tenant);
}

/** Harameen is a supermarket / wholesale market — never a dine-in restaurant. */
export function isHarameenFulfillmentTenant(): boolean {
  const tenant = (process.env.NEXT_PUBLIC_TENANT || '').trim().toLowerCase();
  if (tenant === 'harameen') return true;
  if (isExplicitRestaurantTenant()) return false;

  const haystack = readPublicIdentity();
  if (
    /aklet|أكلة|warda|وردة|goldensand|hettsamaka/.test(haystack) &&
    !/harameen|الحرمين/.test(haystack)
  ) {
    return false;
  }

  return /harameen|الحرمين/.test(haystack);
}

/**
 * When `delivery_only`, welcome shows Delivery only (no dine-in / takeaway).
 * Harameen stays delivery-only even if NEXT_PUBLIC_FULFILLMENT_MODE is missing
 * on Vercel — restaurant tenants keep dine-in/takeaway unless they opt in.
 */
export function getFulfillmentMode(): FulfillmentMode {
  const explicit = (process.env.NEXT_PUBLIC_FULFILLMENT_MODE || '').trim().toLowerCase();
  if (explicit === 'delivery_only') return 'delivery_only';
  if (explicit === 'default') return 'default';

  if (isExplicitRestaurantTenant()) return 'default';
  if (isHarameenFulfillmentTenant()) return 'delivery_only';

  // This customer branch is Harameen wholesale. An unset env must not
  // resurrect restaurant صالة / تيك أواي cards in production.
  return 'delivery_only';
}

export function isDeliveryOnlyMode(): boolean {
  return getFulfillmentMode() === 'delivery_only';
}
