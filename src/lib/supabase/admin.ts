import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, isServer, requireServerEnv } from '@/lib/env';

let adminClient: SupabaseClient | null = null;

/** Service-role Supabase client for server-side writes (bypasses RLS). */
export function createAdminClient(): SupabaseClient {
  if (!isServer) {
    throw new Error('Admin Supabase client can only be used on the server');
  }

  if (adminClient) return adminClient;

  const serverEnv = requireServerEnv();
  const serviceKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }

  adminClient = createClient(serverEnv.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return adminClient;
}

/** Reset cached client (tests). */
export function resetAdminClientForTests(): void {
  adminClient = null;
}

export { env };
