'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useStaffProfile } from '@/hooks/useStaffProfile';
import { hasDailyOps } from '@/i18n/config';
import { defaultStaffHome, isStaffPathAllowed } from '@/lib/staff/permissions';

export function StaffRoleGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: profile, isLoading } = useStaffProfile();

  useEffect(() => {
    if (!hasDailyOps || isLoading) return;
    if (!isStaffPathAllowed(profile, pathname)) {
      router.replace(defaultStaffHome(profile));
    }
  }, [pathname, profile, isLoading, router]);

  if (hasDailyOps && isLoading && !isStaffPathAllowed(profile, pathname)) {
    return null;
  }

  return <>{children}</>;
}
