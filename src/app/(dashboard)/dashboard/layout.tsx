import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { isEcommerceStore } from '@/lib/store-config';

export default function DashboardSectionLayout({ children }: { children: React.ReactNode }) {
  if (isEcommerceStore) return children;
  return <DashboardShell>{children}</DashboardShell>;
}
