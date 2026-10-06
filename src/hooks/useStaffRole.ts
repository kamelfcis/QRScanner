'use client';

import { hasDailyOps } from '@/i18n/config';
import type { StaffRole } from '@/lib/staff/roles';
import { staffRoleKeys, useStaffProfile } from './useStaffProfile';

export type { StaffRole };
export { staffRoleKeys };

export function useStaffRole() {
  const query = useStaffProfile();

  if (!hasDailyOps) {
    return { ...query, data: 'admin' as StaffRole, isLoading: false };
  }

  return {
    ...query,
    data: query.data?.role ?? null,
  };
}
