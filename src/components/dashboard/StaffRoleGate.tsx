'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useStaffRole } from '@/hooks/useStaffRole';
import { hasHettSamakaTier3 } from '@/i18n/config';
import { isAdminOnlyDashboardPath } from '@/lib/staff/roles';

export function StaffRoleGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: role, isLoading } = useStaffRole();

  useEffect(() => {
    if (!hasHettSamakaTier3 || isLoading) return;
    if (role === 'cashier' && isAdminOnlyDashboardPath(pathname)) {
      router.replace('/dashboard/orders');
    }
  }, [pathname, role, isLoading, router]);

  if (hasHettSamakaTier3 && isLoading && isAdminOnlyDashboardPath(pathname)) {
    return null;
  }

  return <>{children}</>;
}
