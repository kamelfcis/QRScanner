import {
  LayoutDashboard,
  Menu,
  Settings,
  QrCode,
  Table,
  FileUp,
  MessageSquareQuote,
  BarChart3,
  FileText,
  ClipboardList,
  TicketPercent,
  Truck,
  ChefHat,
  Scale,
  Wallet,
  Package,
  BookOpen,
  Building2,
  ShoppingCart,
  Gift,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import { hasDailyOps, isAlaKeefakTenant } from '@/i18n/config';
import {
  canAccessExpenses,
  canAccessInventory,
  canAccessOstolAdmin,
  canManageCoupons,
  type StaffRole,
} from '@/lib/staff/roles';
import type { FeatureSettings, RestaurantSettings } from '@/types/database';

export interface DashboardNavItem {
  key: string;
  href: string;
  icon: LucideIcon;
  featureFlag?: keyof FeatureSettings;
  restaurantFlag?: keyof Pick<RestaurantSettings, 'enable_delivery'>;
  /** When set, only these roles see the item (daily ops tenants). */
  roles?: StaffRole[];
  dailyOpsOnly?: boolean;
  /** Ala Keefak / Ostol POS only (isAlaKeefakTenant). */
  alaKeefakOnly?: boolean;
}

/** Single source of truth for sidebar + mobile sheet nav */
export const DASHBOARD_NAV: DashboardNavItem[] = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    key: 'orders',
    href: '/dashboard/orders',
    icon: ClipboardList,
    featureFlag: 'dashboard_orders',
  },
  {
    key: 'kitchen',
    href: '/kitchen',
    icon: ChefHat,
    featureFlag: 'dashboard_orders',
  },
  {
    key: 'coupons',
    href: '/dashboard/coupons',
    icon: TicketPercent,
    featureFlag: 'coupons',
    roles: ['admin'],
  },
  {
    key: 'expenses',
    href: '/dashboard/expenses',
    icon: Wallet,
    dailyOpsOnly: true,
    roles: ['admin'],
  },
  {
    key: 'deliveryLocations',
    href: '/dashboard/delivery-locations',
    icon: Truck,
    restaurantFlag: 'enable_delivery',
  },
  { key: 'analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { key: 'reports', href: '/dashboard/reports', icon: FileText },
  { key: 'shift', href: '/dashboard/shift', icon: Scale },
  {
    key: 'inventory',
    href: '/dashboard/inventory',
    icon: Package,
    alaKeefakOnly: true,
    dailyOpsOnly: true,
  },
  {
    key: 'recipes',
    href: '/dashboard/recipes',
    icon: BookOpen,
    alaKeefakOnly: true,
    dailyOpsOnly: true,
    roles: ['admin'],
  },
  {
    key: 'suppliers',
    href: '/dashboard/suppliers',
    icon: Building2,
    alaKeefakOnly: true,
    dailyOpsOnly: true,
    roles: ['admin'],
  },
  {
    key: 'purchases',
    href: '/dashboard/purchases',
    icon: ShoppingCart,
    alaKeefakOnly: true,
    dailyOpsOnly: true,
    roles: ['admin'],
  },
  {
    key: 'loyalty',
    href: '/dashboard/loyalty',
    icon: Gift,
    alaKeefakOnly: true,
    dailyOpsOnly: true,
    roles: ['admin'],
  },
  {
    key: 'productOffers',
    href: '/dashboard/product-offers',
    icon: Tag,
    alaKeefakOnly: true,
    dailyOpsOnly: true,
    roles: ['admin'],
  },
  { key: 'menu', href: '/dashboard/menu', icon: Menu },
  { key: 'import', href: '/dashboard/import', icon: FileUp },
  { key: 'testimonials', href: '/dashboard/testimonials', icon: MessageSquareQuote },
  { key: 'qrCodes', href: '/dashboard/qr', icon: QrCode },
  { key: 'tables', href: '/dashboard/tables', icon: Table },
  { key: 'settings', href: '/dashboard/settings', icon: Settings },
];

export const CASHIER_NAV_KEYS = new Set(['dashboard', 'orders', 'kitchen', 'shift', 'inventory']);

export function getDashboardNav(
  features?: FeatureSettings | null,
  restaurant?: Pick<RestaurantSettings, 'enable_delivery'> | null,
  role: StaffRole = 'admin'
): DashboardNavItem[] {
  return DASHBOARD_NAV.filter((item) => {
    if (item.dailyOpsOnly && !hasDailyOps) return false;
    if (item.alaKeefakOnly && !isAlaKeefakTenant) return false;
    if (item.featureFlag && features?.[item.featureFlag] !== true) return false;
    if (item.restaurantFlag && restaurant?.[item.restaurantFlag] !== true) return false;
    if (hasDailyOps && role === 'cashier') {
      if (!CASHIER_NAV_KEYS.has(item.key)) return false;
    }
    if (item.roles && !item.roles.includes(role)) return false;
    if (item.key === 'coupons' && !canManageCoupons(role)) return false;
    if (item.key === 'expenses' && !canAccessExpenses(role)) return false;
    if (item.key === 'inventory' && !canAccessInventory(role)) return false;
    if (
      ['recipes', 'suppliers', 'purchases', 'loyalty', 'productOffers'].includes(item.key) &&
      !canAccessOstolAdmin(role)
    ) {
      return false;
    }
    return true;
  });
}
