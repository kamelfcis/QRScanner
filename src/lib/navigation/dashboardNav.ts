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
  Link2,
  type LucideIcon,
} from 'lucide-react';
import { hasDailyOps } from '@/i18n/config';
import { canAccessExpenses, canManageCoupons, type StaffRole } from '@/lib/staff/roles';
import { getDashboardNavItems, isEcommerceStore } from '@/lib/store-config';
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
}

/**
 * Ala Keefak production sidebar (commit a4aaa47), plus Ostol link page
 * and Mazen ecommerce destinations. Store mode filters the visible set.
 */
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
  { key: 'analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { key: 'reports', href: '/dashboard/reports', icon: FileText },
  { key: 'shift', href: '/dashboard/shift', icon: Scale },
  { key: 'menu', href: '/dashboard/menu', icon: Menu },
  { key: 'import', href: '/dashboard/import', icon: FileUp },
  { key: 'testimonials', href: '/dashboard/testimonials', icon: MessageSquareQuote },
  { key: 'qrCodes', href: '/dashboard/qr', icon: QrCode },
  { key: 'linkPage', href: '/dashboard/link-page', icon: Link2 },
  {
    key: 'deliveryLocations',
    href: '/dashboard/delivery-locations',
    icon: Truck,
    restaurantFlag: 'enable_delivery',
  },
  { key: 'instapayProofs', href: '/dashboard/instapay-proofs', icon: Wallet },
  { key: 'tables', href: '/dashboard/tables', icon: Table },
  { key: 'settings', href: '/dashboard/settings', icon: Settings },
];

export const CASHIER_NAV_KEYS = new Set(['dashboard', 'orders', 'kitchen', 'shift']);

/** Sidebar + mobile nav for the active store mode, then Ala Keefak role/feature gates. */
export function getDashboardNav(
  features?: FeatureSettings | null,
  restaurant?: Pick<RestaurantSettings, 'enable_delivery'> | null,
  role: StaffRole = 'admin'
): DashboardNavItem[] {
  const items = getDashboardNavItems(DASHBOARD_NAV);
  if (isEcommerceStore) return items;

  return items.filter((item) => {
    if (item.dailyOpsOnly && !hasDailyOps) return false;
    if (item.featureFlag && features?.[item.featureFlag] !== true) return false;
    if (item.restaurantFlag && restaurant?.[item.restaurantFlag] !== true) return false;
    if (hasDailyOps && role === 'cashier' && !CASHIER_NAV_KEYS.has(item.key)) return false;
    if (item.roles && !item.roles.includes(role)) return false;
    if (item.key === 'coupons' && !canManageCoupons(role)) return false;
    if (item.key === 'expenses' && !canAccessExpenses(role)) return false;
    return true;
  });
}
