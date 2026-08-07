'use client';

import { useAuth } from './useAuth';

/** Gate admin Supabase reads until the session is ready (RLS requires auth.uid()). */
export function useAdminQueryEnabled() {
  const { isAuthenticated, loading } = useAuth();
  return isAuthenticated && !loading;
}
