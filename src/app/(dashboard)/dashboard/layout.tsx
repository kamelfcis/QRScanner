import { DashboardShell } from '@/components/dashboard/DashboardShell';

export default function DashboardSectionLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
