import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import type { RestaurantSettings, Settings } from '@/types';

async function fetchRestaurantSettingsUncached(): Promise<RestaurantSettings | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    const supabase = createSupabaseClient(url, key);
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'restaurant')
      .single();

    if (error) return null;
    return (data as Pick<Settings, 'value'>).value as unknown as RestaurantSettings;
  } catch {
    return null;
  }
}

/** Server-side restaurant settings (cached ~5 min for metadata/favicon). */
export const fetchRestaurantSettings = unstable_cache(
  fetchRestaurantSettingsUncached,
  ['restaurant-settings'],
  { revalidate: 300, tags: ['restaurant-settings'] }
);
