'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useStaffRole } from '@/hooks/useStaffRole';
import { hasDailyOps } from '@/i18n/config';
import { isAdminOnlyDashboardPath } from '@/lib/staff/roles';

export function StaffRoleGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: role, isLoading } = useStaffRole();

  useEffect(() => {
    if (!hasDailyOps || isLoading) return;
    if (role === 'cashier' && isAdminOnlyDashboardPath(pathname)) {
      router.replace('/dashboard/orders');
    }
  }, [pathname, role, isLoading, router]);

  if (hasDailyOps && isLoading && isAdminOnlyDashboardPath(pathname)) {
    return null;
  }

  return <>{children}</>;
}
