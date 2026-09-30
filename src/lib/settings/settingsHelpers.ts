import type { PostgrestError } from '@supabase/supabase-js';

export function isSettingsNotFoundError(error: PostgrestError | null): boolean {
  return error?.code === 'PGRST116';
}
