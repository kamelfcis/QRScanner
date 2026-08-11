'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
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
    async (email: string, password: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
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
      router.push(redirect && redirect.startsWith('/dashboard') ? redirect : '/dashboard');
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
