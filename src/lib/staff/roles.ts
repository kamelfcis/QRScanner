import { hasDailyOps, isAlaKeefakTenant } from '@/i18n/config';

export type StaffRole = 'admin' | 'cashier';

const CASHIER_PREFIXES = [
  '/dashboard/orders',
  '/dashboard/shift',
  '/dashboard/inventory',
  '/kitchen',
] as const;

const OSTOL_ADMIN_PREFIXES = [
  '/dashboard/recipes',
  '/dashboard/suppliers',
  '/dashboard/purchases',
  '/dashboard/loyalty',
  '/dashboard/product-offers',
] as const;

/** Paths cashiers may access (orders, kitchen, shift, sold-out via orders/kitchen). */
export function isCashierPathAllowed(pathname: string): boolean {
  if (!hasDailyOps) return true;
  if (pathname === '/dashboard') return true;
  return CASHIER_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isAdminOnlyDashboardPath(pathname: string): boolean {
  if (!pathname.startsWith('/dashboard') && !pathname.startsWith('/kitchen')) return false;
  return !isCashierPathAllowed(pathname);
}

export function canHardDeleteOrders(role: StaffRole | null | undefined): boolean {
  if (!hasDailyOps) return true;
  return role !== 'cashier';
}

export function canManageCoupons(role: StaffRole | null | undefined): boolean {
  if (!hasDailyOps) return true;
  return role !== 'cashier';
}

export function canAccessExpenses(role: StaffRole | null | undefined): boolean {
  if (!hasDailyOps) return true;
  return role !== 'cashier';
}

/** Ostol POS inventory read (cashiers + admin). */
export function canAccessInventory(role: StaffRole | null | undefined): boolean {
  if (!isAlaKeefakTenant) return false;
  if (!hasDailyOps) return true;
  return role === 'admin' || role === 'cashier';
}

/** Ostol POS admin modules: recipes, suppliers, purchases, loyalty, offers. */
export function canAccessOstolAdmin(role: StaffRole | null | undefined): boolean {
  if (!isAlaKeefakTenant) return false;
  return role !== 'cashier';
}

export function isOstolAdminOnlyPath(pathname: string): boolean {
  if (!isAlaKeefakTenant) return false;
  return OSTOL_ADMIN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
