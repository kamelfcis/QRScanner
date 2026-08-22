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
  type LucideIcon,
} from 'lucide-react';
import type { FeatureSettings } from '@/types/database';

export interface DashboardNavItem {
  key: string;
  href: string;
  icon: LucideIcon;
  featureFlag?: keyof FeatureSettings;
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
  { key: 'coupons', href: '/dashboard/coupons', icon: TicketPercent, featureFlag: 'coupons' },
  { key: 'analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { key: 'reports', href: '/dashboard/reports', icon: FileText },
  { key: 'menu', href: '/dashboard/menu', icon: Menu },
  { key: 'import', href: '/dashboard/import', icon: FileUp },
  { key: 'testimonials', href: '/dashboard/testimonials', icon: MessageSquareQuote },
  { key: 'qrCodes', href: '/dashboard/qr', icon: QrCode },
  { key: 'tables', href: '/dashboard/tables', icon: Table },
  { key: 'settings', href: '/dashboard/settings', icon: Settings },
];

export function getDashboardNav(features?: FeatureSettings | null): DashboardNavItem[] {
  return DASHBOARD_NAV.filter((item) => {
    if (!item.featureFlag) return true;
    return features?.[item.featureFlag] === true;
  });
}
