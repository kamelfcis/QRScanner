import { hasDailyOps } from '@/i18n/config';

export type StaffRole = 'admin' | 'cashier' | 'kitchen' | 'custom';
export type StaffAction = 'view' | 'create' | 'update' | 'delete';

export const STAFF_RESOURCES = [
  'dashboard',
  'orders',
  'kitchen',
  'coupons',
  'expenses',
  'deliveryLocations',
  'analytics',
  'reports',
  'shift',
  'menu',
  'import',
  'testimonials',
  'qrCodes',
  'tables',
  'settings',
  'users',
] as const;

export type StaffResource = (typeof STAFF_RESOURCES)[number];

export type PermissionMap = Partial<Record<StaffResource, StaffAction[]>>;

export type StaffProfile = {
  user_id: string;
  role: StaffRole;
  full_name: string;
  permissions: PermissionMap;
  is_active: boolean;
};

export const ALL_ACTIONS: StaffAction[] = ['view', 'create', 'update', 'delete'];

const WRITES: StaffAction[] = ['create', 'update', 'delete'];

export const CASHIER_PERMISSIONS: PermissionMap = {
  dashboard: ['view'],
  orders: ['view', 'create', 'update'],
  kitchen: ['view', 'update'],
  shift: ['view', 'create', 'update'],
};

export const KITCHEN_PERMISSIONS: PermissionMap = {
  kitchen: ['view', 'update'],
};

export const ADMIN_PERMISSIONS: PermissionMap = Object.fromEntries(
  STAFF_RESOURCES.map((resource) => [resource, [...ALL_ACTIONS]])
) as PermissionMap;

const PATH_RESOURCES: Array<{ prefix: string; resource: StaffResource }> = [
  { prefix: '/dashboard/users', resource: 'users' },
  { prefix: '/dashboard/orders', resource: 'orders' },
  { prefix: '/dashboard/coupons', resource: 'coupons' },
  { prefix: '/dashboard/expenses', resource: 'expenses' },
  { prefix: '/dashboard/delivery-locations', resource: 'deliveryLocations' },
  { prefix: '/dashboard/analytics', resource: 'analytics' },
  { prefix: '/dashboard/reports', resource: 'reports' },
  { prefix: '/dashboard/shift', resource: 'shift' },
  { prefix: '/dashboard/menu', resource: 'menu' },
  { prefix: '/dashboard/import', resource: 'import' },
  { prefix: '/dashboard/testimonials', resource: 'testimonials' },
  { prefix: '/dashboard/qr', resource: 'qrCodes' },
  { prefix: '/dashboard/tables', resource: 'tables' },
  { prefix: '/dashboard/settings', resource: 'settings' },
  { prefix: '/kitchen', resource: 'kitchen' },
];

export function isStaffRole(value: unknown): value is StaffRole {
  return value === 'admin' || value === 'cashier' || value === 'kitchen' || value === 'custom';
}

export function parsePermissionMap(value: unknown): PermissionMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: PermissionMap = {};
  for (const resource of STAFF_RESOURCES) {
    const raw = (value as Record<string, unknown>)[resource];
    if (!Array.isArray(raw)) continue;
    const actions = raw.filter((item): item is StaffAction =>
      ALL_ACTIONS.includes(item as StaffAction)
    );
    if (actions.length > 0) out[resource] = actions;
  }
  return out;
}

export function presetPermissions(role: StaffRole, custom?: PermissionMap): PermissionMap {
  if (role === 'admin') return ADMIN_PERMISSIONS;
  if (role === 'cashier') return CASHIER_PERMISSIONS;
  if (role === 'kitchen') return KITCHEN_PERMISSIONS;
  return custom ?? {};
}

export function profileFromRole(role: StaffRole, extras?: Partial<StaffProfile>): StaffProfile {
  return {
    user_id: extras?.user_id ?? '',
    role,
    full_name: extras?.full_name ?? '',
    permissions: extras?.permissions ?? {},
    is_active: extras?.is_active ?? true,
  };
}

export function normalizeStaffProfile(
  value: StaffProfile | StaffRole | null | undefined
): StaffProfile | null {
  if (!value) return null;
  if (typeof value === 'string') {
    if (!isStaffRole(value)) return null;
    return profileFromRole(value);
  }
  if (!isStaffRole(value.role)) return null;
  return {
    user_id: value.user_id,
    role: value.role,
    full_name: value.full_name ?? '',
    permissions: parsePermissionMap(value.permissions),
    is_active: value.is_active !== false,
  };
}

function actionsFor(profile: StaffProfile, resource: StaffResource): StaffAction[] {
  if (profile.role === 'admin') return ALL_ACTIONS;
  if (resource === 'users') return [];
  const map = presetPermissions(profile.role, profile.permissions);
  return map[resource] ?? [];
}

export function can(
  profile: StaffProfile | StaffRole | null | undefined,
  resource: StaffResource,
  action: StaffAction,
  options?: { enforce?: boolean }
): boolean {
  const enforce = options?.enforce ?? hasDailyOps;
  if (!enforce) return true;

  const resolved = normalizeStaffProfile(profile);
  if (!resolved || !resolved.is_active) return false;

  const allowed = actionsFor(resolved, resource);
  if (allowed.includes(action)) return true;
  if (action === 'view' && WRITES.some((write) => allowed.includes(write))) return true;
  return false;
}

export function resourceForPath(pathname: string): StaffResource | null {
  if (pathname === '/dashboard' || pathname === '/dashboard/') return 'dashboard';
  if (pathname === '/kitchen' || pathname.startsWith('/kitchen/')) return 'kitchen';
  for (const entry of PATH_RESOURCES) {
    if (pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`)) {
      return entry.resource;
    }
  }
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  return null;
}

export function isStaffPathAllowed(
  profile: StaffProfile | StaffRole | null | undefined,
  pathname: string,
  options?: { enforce?: boolean }
): boolean {
  const enforce = options?.enforce ?? hasDailyOps;
  if (!enforce) return true;
  if (!pathname.startsWith('/dashboard') && !pathname.startsWith('/kitchen')) return true;
  const resource = resourceForPath(pathname);
  if (!resource) return false;
  return can(profile, resource, 'view', { enforce });
}

export function defaultStaffHome(
  profile: StaffProfile | StaffRole | null | undefined,
  options?: { enforce?: boolean }
): string {
  const enforce = options?.enforce ?? hasDailyOps;
  if (!enforce) return '/dashboard';
  if (can(profile, 'dashboard', 'view', { enforce })) return '/dashboard';
  if (can(profile, 'orders', 'view', { enforce })) return '/dashboard/orders';
  if (can(profile, 'kitchen', 'view', { enforce })) return '/kitchen';
  if (can(profile, 'shift', 'view', { enforce })) return '/dashboard/shift';
  return '/dashboard';
}

export function isKitchenOnly(profile: StaffProfile | StaffRole | null | undefined): boolean {
  const resolved = normalizeStaffProfile(profile);
  if (!resolved) return false;
  return resolved.role === 'kitchen';
}
