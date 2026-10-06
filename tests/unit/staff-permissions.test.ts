import { describe, expect, it } from 'vitest';
import {
  can,
  defaultStaffHome,
  isStaffPathAllowed,
  profileFromRole,
  type PermissionMap,
} from '@/lib/staff/permissions';

const enforce = { enforce: true as const };

describe('staff permissions', () => {
  it('admin can do everything', () => {
    const admin = profileFromRole('admin');
    expect(can(admin, 'menu', 'delete', enforce)).toBe(true);
    expect(can(admin, 'users', 'create', enforce)).toBe(true);
    expect(can(admin, 'settings', 'update', enforce)).toBe(true);
  });

  it('cashier cannot access menu, settings, or users', () => {
    const cashier = profileFromRole('cashier');
    expect(can(cashier, 'orders', 'create', enforce)).toBe(true);
    expect(can(cashier, 'kitchen', 'update', enforce)).toBe(true);
    expect(can(cashier, 'shift', 'view', enforce)).toBe(true);
    expect(can(cashier, 'menu', 'view', enforce)).toBe(false);
    expect(can(cashier, 'settings', 'view', enforce)).toBe(false);
    expect(can(cashier, 'users', 'view', enforce)).toBe(false);
    expect(isStaffPathAllowed(cashier, '/dashboard/menu', enforce)).toBe(false);
    expect(isStaffPathAllowed(cashier, '/dashboard/orders', enforce)).toBe(true);
  });

  it('kitchen is kitchen-only and homes to /kitchen', () => {
    const kitchen = profileFromRole('kitchen');
    expect(can(kitchen, 'kitchen', 'view', enforce)).toBe(true);
    expect(can(kitchen, 'kitchen', 'update', enforce)).toBe(true);
    expect(can(kitchen, 'orders', 'view', enforce)).toBe(false);
    expect(can(kitchen, 'dashboard', 'view', enforce)).toBe(false);
    expect(isStaffPathAllowed(kitchen, '/dashboard/menu', enforce)).toBe(false);
    expect(isStaffPathAllowed(kitchen, '/kitchen', enforce)).toBe(true);
    expect(defaultStaffHome(kitchen, enforce)).toBe('/kitchen');
  });

  it('custom matrix is honored and write implies view', () => {
    const permissions: PermissionMap = {
      reports: ['update'],
      analytics: ['view'],
    };
    const custom = profileFromRole('custom', { permissions });
    expect(can(custom, 'reports', 'view', enforce)).toBe(true);
    expect(can(custom, 'reports', 'update', enforce)).toBe(true);
    expect(can(custom, 'reports', 'delete', enforce)).toBe(false);
    expect(can(custom, 'analytics', 'view', enforce)).toBe(true);
    expect(can(custom, 'menu', 'view', enforce)).toBe(false);
    expect(can(custom, 'users', 'view', enforce)).toBe(false);
  });

  it('missing or inactive profile is deny when enforced', () => {
    expect(can(null, 'dashboard', 'view', enforce)).toBe(false);
    expect(can(profileFromRole('admin', { is_active: false }), 'dashboard', 'view', enforce)).toBe(
      false
    );
  });

  it('does not enforce on tenants without daily ops', () => {
    expect(can(null, 'menu', 'delete', { enforce: false })).toBe(true);
  });
});
