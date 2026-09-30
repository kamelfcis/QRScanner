import type { CartDiningMode } from '@/stores/cart-store';

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
