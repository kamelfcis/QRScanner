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
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { getDashboardNavItems } from '@/lib/store-config';

export interface DashboardNavItem {
  key: string;
  href: string;
  icon: LucideIcon;
}

/** Single source of truth for sidebar + mobile sheet nav */
export const DASHBOARD_NAV: DashboardNavItem[] = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { key: 'reports', href: '/dashboard/reports', icon: FileText },
  { key: 'menu', href: '/dashboard/menu', icon: Menu },
  { key: 'import', href: '/dashboard/import', icon: FileUp },
  { key: 'testimonials', href: '/dashboard/testimonials', icon: MessageSquareQuote },
  { key: 'qrCodes', href: '/dashboard/qr', icon: QrCode },
  { key: 'deliveryLocations', href: '/dashboard/delivery-locations', icon: Truck },
  { key: 'tables', href: '/dashboard/tables', icon: Table },
  { key: 'settings', href: '/dashboard/settings', icon: Settings },
];

/** Sidebar + mobile nav items for the active store mode. */
export function getDashboardNav(): DashboardNavItem[] {
  return getDashboardNavItems(DASHBOARD_NAV);
}
