'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAlaKeefakTenant } from '@/i18n/config';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { useStaffRole } from '@/hooks/useStaffRole';
import { canAccessInventory, canAccessOstolAdmin } from '@/lib/staff/roles';

interface OstolGateProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export function OstolGate({ children, adminOnly = false }: OstolGateProps) {
  const router = useRouter();
  const { data: role, isLoading } = useStaffRole();

  useEffect(() => {
    if (!isAlaKeefakTenant) {
      router.replace('/dashboard');
      return;
    }
    if (!isLoading) {
      const allowed = adminOnly ? canAccessOstolAdmin(role) : canAccessInventory(role);
      if (!allowed) router.replace('/dashboard/orders');
    }
  }, [adminOnly, isLoading, role, router]);

  if (!isAlaKeefakTenant || isLoading) return <LoadingPage />;
  if (adminOnly && !canAccessOstolAdmin(role)) return <LoadingPage />;
  if (!adminOnly && !canAccessInventory(role)) return <LoadingPage />;

  return <>{children}</>;
}
