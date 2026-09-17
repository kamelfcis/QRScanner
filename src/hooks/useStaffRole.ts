'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAdminQueryEnabled } from './useAdminQueryEnabled';
import { hasHettSamakaTier3 } from '@/i18n/config';
import type { StaffRole } from '@/lib/staff/roles';

export type { StaffRole };

export const staffRoleKeys = {
  all: ['staff-role'] as const,
  me: () => [...staffRoleKeys.all, 'me'] as const,
};

async function fetchMyStaffRole(): Promise<StaffRole> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 'admin';

  const { data, error } = await supabase
    .from('staff_profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.warn('[useStaffRole] staff_profiles query failed, defaulting to admin:', error.message);
    return 'admin';
  }
  const role = data?.role;
  if (role === 'cashier' || role === 'admin') return role;
  return 'admin';
}

export function useStaffRole() {
  const enabled = useAdminQueryEnabled() && hasHettSamakaTier3;

  return useQuery<StaffRole>({
    queryKey: staffRoleKeys.me(),
    queryFn: fetchMyStaffRole,
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
    ...(hasHettSamakaTier3 ? {} : { initialData: 'admin' as const }),
  });
}
