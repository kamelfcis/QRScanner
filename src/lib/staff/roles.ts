import { hasDailyOps } from '@/i18n/config';

export type StaffRole = 'admin' | 'cashier';

const CASHIER_PREFIXES = ['/dashboard/orders', '/dashboard/shift', '/kitchen'] as const;

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
