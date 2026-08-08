import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import { DEFAULT_THEME } from '@/lib/theme';
import type { RestaurantSettings, Settings, ThemeSettings } from '@/types';

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

async function fetchThemeSettingsUncached(): Promise<ThemeSettings> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return DEFAULT_THEME;

  try {
    const supabase = createSupabaseClient(url, key);
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'theme')
      .single();

    if (error || !data?.value) return DEFAULT_THEME;
    return { ...DEFAULT_THEME, ...(data.value as ThemeSettings) };
  } catch {
    return DEFAULT_THEME;
  }
}

/** Server-side theme settings (cached ~5 min for manifest/PWA). */
export const fetchThemeSettings = unstable_cache(fetchThemeSettingsUncached, ['theme-settings'], {
  revalidate: 300,
  tags: ['theme-settings'],
});
