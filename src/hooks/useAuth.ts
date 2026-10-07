'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isStaffAppPath } from '@/lib/auth/staff-path';
import { hasDailyOps, isAlaKeefakTenant } from '@/i18n/config';
import {
  defaultStaffHome,
  isStaffPathAllowed,
  isStaffRole,
  parsePermissionMap,
} from '@/lib/staff/permissions';
import type { User, AuthError } from '@supabase/supabase-js';

const supabase = createClient();

interface AuthState {
  user: User | null;
  loading: boolean;
  error: AuthError | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const getUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (mounted) {
          setState({ user, loading: false, error });
        }
      } catch (err) {
        if (mounted) {
          setState({ user: null, loading: false, error: err as AuthError });
        }
      }
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setState((prev) => ({
          ...prev,
          user: session?.user ?? null,
          loading: false,
        }));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    async (identifier: string, password: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      let email = identifier.trim();
      if (isAlaKeefakTenant) {
        const { data: resolved, error: rpcError } = await supabase.rpc(
          'resolve_staff_login_email',
          {
            p_identifier: identifier.trim(),
          }
        );
        if (rpcError || !resolved) {
          const authError = (rpcError ?? {
            message: 'Invalid login credentials',
            name: 'AuthApiError',
            status: 400,
          }) as AuthError;
          setState((prev) => ({ ...prev, loading: false, error: authError }));
          throw authError;
        }
        email = resolved;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setState((prev) => ({ ...prev, loading: false, error }));
        throw error;
      }

      setState({ user: data.user, loading: false, error: null });
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      let dest = redirect && isStaffAppPath(redirect) ? redirect : '/dashboard';
      if (hasDailyOps && data.user) {
        const { data: row } = await supabase
          .from('staff_profiles')
          .select('role, permissions, is_active')
          .eq('user_id', data.user.id)
          .maybeSingle();
        const profile =
          row && isStaffRole(row.role) && row.is_active !== false
            ? {
                user_id: data.user.id,
                role: row.role,
                full_name: '',
                permissions: parsePermissionMap(row.permissions),
                is_active: row.is_active !== false,
              }
            : null;
        if (!profile || !isStaffPathAllowed(profile, dest)) {
          dest = defaultStaffHome(profile);
        }
      }
      router.push(dest);
      return data;
    },
    [router]
  );

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.signOut();
    if (error) {
      setState((prev) => ({ ...prev, loading: false, error }));
      throw error;
    }
    setState({ user: null, loading: false, error: null });
    router.push('/login');
  }, [router]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user?.email) throw new Error('Not authenticated');

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (reauthError) throw reauthError;

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (updateError) throw updateError;
  }, []);

  return {
    ...state,
    signIn,
    signOut,
    changePassword,
    isAuthenticated: !!state.user,
  };
}
