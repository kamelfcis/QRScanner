import type { CartDiningMode } from '@/stores/cart-store';
import { OSTOL_ONLY_DASHBOARD_NAV_KEYS, showLinkPage } from '@/lib/tenant-config';

export type StoreMode = 'restaurant' | 'ecommerce';

const rawStoreMode = process.env.NEXT_PUBLIC_STORE_MODE?.trim().toLowerCase();
const rawQrTarget = process.env.NEXT_PUBLIC_QR_TARGET_PATH?.trim();

/** `ecommerce` hides dining/takeaway UI and uses a single shopping flow. */
export const storeMode: StoreMode = rawStoreMode === 'ecommerce' ? 'ecommerce' : 'restaurant';

export const isEcommerceStore = storeMode === 'ecommerce';

/** Whether dine-in / takeaway toggles appear in the menu and checkout. */
export const showDiningModeToggle = !isEcommerceStore;

/** Customer entry path for menu links and QR codes (must start with `/`). */
export const qrTargetPath = normalizePath(rawQrTarget || (isEcommerceStore ? '/menu' : '/welcome'));

/** When true, `/welcome` redirects straight to the menu entry path. */
export const skipWelcomePage = isEcommerceStore || qrTargetPath !== '/welcome';

/** Default order mode when dining toggles are hidden. */
export const defaultDiningMode: CartDiningMode = isEcommerceStore ? 'takeaway' : 'dining';

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === '/') return '/';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/+$/, '') || '/';
}

/** Landing nav, hero CTA, footer — same path as QR target. */
export function getMenuEntryPath(): string {
  return qrTargetPath;
}

/** Dashboard routes that only apply to restaurant mode (tables, dining reports, etc.). */
export const RESTAURANT_ONLY_DASHBOARD_PATHS = [
  '/dashboard/orders',
  '/dashboard/coupons',
  '/dashboard/shift',
  '/dashboard/expenses',
  '/dashboard/tables',
  '/dashboard/reports',
  '/dashboard/analytics/heatmaps',
  '/kitchen',
] as const;

/** Sidebar keys hidden when `NEXT_PUBLIC_STORE_MODE=ecommerce`. */
export const ECOMMERCE_HIDDEN_DASHBOARD_NAV_KEYS = new Set([
  'orders',
  'kitchen',
  'coupons',
  'expenses',
  'shift',
  'tables',
  'reports',
  'linkPage',
]);

/** Sidebar keys shown only when `NEXT_PUBLIC_STORE_MODE=ecommerce`. */
export const ECOMMERCE_ONLY_DASHBOARD_NAV_KEYS = new Set(['deliveryLocations', 'instapayProofs']);

export function isRestaurantOnlyDashboardPath(pathname: string): boolean {
  return RESTAURANT_ONLY_DASHBOARD_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

/** Filtered dashboard nav for the current store mode. */
export function getDashboardNavItems<T extends { key: string }>(items: readonly T[]): T[] {
  let filtered: T[];
  if (!isEcommerceStore) {
    filtered = items.filter((item) => !ECOMMERCE_ONLY_DASHBOARD_NAV_KEYS.has(item.key));
  } else {
    filtered = items.filter((item) => !ECOMMERCE_HIDDEN_DASHBOARD_NAV_KEYS.has(item.key));
  }
  if (!showLinkPage) {
    filtered = filtered.filter((item) => !OSTOL_ONLY_DASHBOARD_NAV_KEYS.has(item.key));
  }
  return filtered;
}

/** Build an in-app menu URL (respects ecommerce vs restaurant defaults). */
export function buildMenuEntryUrl(table?: string | null, mode?: CartDiningMode): string {
  const params = new URLSearchParams();
  const resolvedMode = mode ?? defaultDiningMode;

  if (!isEcommerceStore) {
    params.set('mode', resolvedMode === 'dining' ? 'dine_in' : 'takeaway');
  }
  if (table) params.set('table', table);

  const qs = params.toString();
  const path = getMenuEntryPath();
  return qs ? `${path}?${qs}` : path;
}
