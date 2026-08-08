import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ThemeSettings } from '@/types';
import { DEFAULT_THEME } from '@/lib/theme';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server component, can't set cookies
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Server component, can't delete cookies
          }
        },
      },
    }
  );
}

export async function getThemeSettings(): Promise<ThemeSettings> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'theme')
      .single();

    if (error || !data?.value) {
      return DEFAULT_THEME;
    }

    return { ...DEFAULT_THEME, ...(data.value as ThemeSettings) };
  } catch {
    return DEFAULT_THEME;
  }
}
