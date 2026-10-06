import { hasDailyOps } from '@/i18n/config';
import {
  can,
  type StaffAction,
  type StaffProfile,
  type StaffResource,
  type StaffRole,
} from '@/lib/staff/permissions';

export type { StaffAction, StaffProfile, StaffResource, StaffRole };
export {
  can,
  defaultStaffHome,
  isStaffPathAllowed,
  STAFF_RESOURCES,
  ALL_ACTIONS,
} from '@/lib/staff/permissions';

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

export function canHardDeleteOrders(role: StaffRole | StaffProfile | null | undefined): boolean {
  if (!hasDailyOps) return true;
  return can(role, 'orders', 'delete');
}

export function canManageCoupons(role: StaffRole | StaffProfile | null | undefined): boolean {
  if (!hasDailyOps) return true;
  return can(role, 'coupons', 'view');
}

export function canAccessExpenses(role: StaffRole | StaffProfile | null | undefined): boolean {
  if (!hasDailyOps) return true;
  return can(role, 'expenses', 'view');
}
