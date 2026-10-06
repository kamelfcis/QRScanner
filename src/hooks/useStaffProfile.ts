'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAdminQueryEnabled } from './useAdminQueryEnabled';
import { hasDailyOps } from '@/i18n/config';
import {
  can,
  isStaffRole,
  parsePermissionMap,
  type StaffAction,
  type StaffProfile,
  type StaffResource,
} from '@/lib/staff/permissions';
export const staffRoleKeys = {
  all: ['staff-role'] as const,
  me: () => [...staffRoleKeys.all, 'me'] as const,
};

function asStaffProfile(
  row: {
    user_id: string;
    role: string;
    full_name?: string | null;
    permissions?: unknown;
    is_active?: boolean | null;
  } | null
): StaffProfile | null {
  if (!row || !isStaffRole(row.role) || row.is_active === false) return null;
  return {
    user_id: row.user_id,
    role: row.role,
    full_name: row.full_name ?? '',
    permissions: parsePermissionMap(row.permissions),
    is_active: true,
  };
}

async function fetchMyStaffProfile(): Promise<StaffProfile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('staff_profiles')
    .select('user_id, role, full_name, permissions, is_active')
    .eq('user_id', user.id)
    .maybeSingle();

  const row = data
    ? data
    : error
      ? (
          await supabase
            .from('staff_profiles')
            .select('user_id, role')
            .eq('user_id', user.id)
            .maybeSingle()
        ).data
      : null;

  if (error && !row) {
    console.warn('[useStaffProfile] staff_profiles query failed, denying access:', error.message);
    return null;
  }
  return asStaffProfile(row);
}

export function useStaffProfile() {
  const enabled = useAdminQueryEnabled() && hasDailyOps;

  return useQuery<StaffProfile | null>({
    queryKey: staffRoleKeys.me(),
    queryFn: fetchMyStaffProfile,
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useCan(resource: StaffResource, action: StaffAction) {
  const query = useStaffProfile();
  const allowed = hasDailyOps ? can(query.data, resource, action) : true;
  return { allowed, isLoading: hasDailyOps && query.isLoading, profile: query.data ?? null };
}
