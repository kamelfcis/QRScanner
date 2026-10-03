'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_THEME } from '@/lib/theme';
import { isSettingsNotFoundError } from '@/lib/settings/settingsHelpers';
import { mergeLinkPageSettings } from '@/lib/link-page/defaults';
import type {
  Settings,
  RestaurantSettings,
  ThemeSettings,
  HoursSettings,
  LinkPageSettings,
  FeatureSettings,
} from '@/types';

const supabase = createClient();

async function revalidateSettingsCache() {
  try {
    await fetch('/api/settings/revalidate', { method: 'POST' });
  } catch {
    // Best-effort — client query invalidation still applies theme in-session
  }
}

export const settingsKeys = {
  all: ['settings'] as const,
  restaurant: () => [...settingsKeys.all, 'restaurant'] as const,
  theme: () => [...settingsKeys.all, 'theme'] as const,
  hours: () => [...settingsKeys.all, 'hours'] as const,
  features: () => [...settingsKeys.all, 'features'] as const,
  linkPage: () => [...settingsKeys.all, 'link_page'] as const,
};

export function useRestaurantSettings() {
  return useQuery({
    queryKey: settingsKeys.restaurant(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'restaurant')
        .single();

      if (error) throw error;
      return (data as Settings).value as unknown as RestaurantSettings;
    },
  });
}

export function useThemeSettings() {
  return useQuery({
    queryKey: settingsKeys.theme(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'theme')
        .maybeSingle();

      if (error) throw error;
      if (!data) return DEFAULT_THEME;
      return { ...DEFAULT_THEME, ...((data as Settings).value as unknown as ThemeSettings) };
    },
  });
}

export function useHoursSettings() {
  return useQuery({
    queryKey: settingsKeys.hours(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'hours')
        .maybeSingle();

      if (error) throw error;
      if (!data) return {} as HoursSettings;
      return (data as Settings).value as unknown as HoursSettings;
    },
  });
}

export function useFeatureSettings() {
  return useQuery({
    queryKey: settingsKeys.features(),
    queryFn: async (): Promise<FeatureSettings> => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'features')
        .maybeSingle();

      if (error) throw error;
      const value =
        (data?.value as
          | {
              ai_product_images?: unknown;
              dashboard_orders?: unknown;
              coupons?: unknown;
              order_prefix?: unknown;
            }
          | undefined) ?? {};
      return {
        ai_product_images: value.ai_product_images === true,
        dashboard_orders: value.dashboard_orders === true,
        coupons: value.coupons === true,
        order_prefix: typeof value.order_prefix === 'string' ? value.order_prefix : undefined,
      };
    },
  });
}

export function useAllSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase.from('settings').select('*');

      if (error) throw error;

      return data.reduce(
        (acc, item) => ({
          ...acc,
          [item.key]: item.value,
        }),
        {} as Record<string, Record<string, unknown>>
      );
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from('settings')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key)
        .select()
        .single();

      if (error) throw error;
      return data as Settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

export function useUpdateRestaurantSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<RestaurantSettings>) => {
      const { data: existing, error: readError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'restaurant')
        .single();

      if (readError) throw new Error('Failed to read current settings');

      const currentSettings = (existing?.value as unknown as RestaurantSettings) || {};
      const updatedSettings = { ...currentSettings, ...input };

      const { data, error } = await supabase
        .from('settings')
        .update({ value: updatedSettings, updated_at: new Date().toISOString() })
        .eq('key', 'restaurant')
        .select()
        .single();

      if (error) throw error;
      return data.value as unknown as RestaurantSettings;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      await revalidateSettingsCache();
    },
  });
}

export function useUpdateHoursSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<HoursSettings>) => {
      const { data: existing, error: readError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'hours')
        .maybeSingle();

      if (readError && !isSettingsNotFoundError(readError)) {
        throw new Error('Failed to read current hours settings');
      }

      const currentSettings = (existing?.value as unknown as HoursSettings | undefined) ?? {};
      const updatedSettings = { ...currentSettings, ...input };

      const { data, error } = await supabase
        .from('settings')
        .upsert(
          { key: 'hours', value: updatedSettings, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        )
        .select()
        .single();

      if (error) throw error;
      return data.value as unknown as HoursSettings;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      await revalidateSettingsCache();
    },
  });
}

export function useLinkPageSettings() {
  return useQuery({
    queryKey: settingsKeys.linkPage(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'link_page')
        .maybeSingle();

      if (error) throw error;
      if (!data) return mergeLinkPageSettings();
      return mergeLinkPageSettings((data as Settings).value as unknown as LinkPageSettings);
    },
  });
}

export function useUpdateLinkPageSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<LinkPageSettings>) => {
      const { data: existing, error: readError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'link_page')
        .maybeSingle();

      if (readError && !isSettingsNotFoundError(readError)) {
        throw new Error('Failed to read current link page settings');
      }

      const currentSettings = mergeLinkPageSettings(
        (existing?.value as unknown as LinkPageSettings | undefined) ?? undefined
      );
      const updatedSettings = mergeLinkPageSettings({ ...currentSettings, ...input });

      const { data, error } = await supabase
        .from('settings')
        .upsert(
          { key: 'link_page', value: updatedSettings, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        )
        .select()
        .single();

      if (error) throw error;
      return data.value as unknown as LinkPageSettings;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      await revalidateSettingsCache();
    },
  });
}

export function useUpdateThemeSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<ThemeSettings>) => {
      const { data: existing, error: readError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'theme')
        .maybeSingle();

      if (readError && !isSettingsNotFoundError(readError)) {
        throw new Error('Failed to read current theme settings');
      }

      const currentSettings =
        (existing?.value as unknown as ThemeSettings | undefined) ?? DEFAULT_THEME;
      const updatedSettings = { ...currentSettings, ...input };

      const { data, error } = await supabase
        .from('settings')
        .upsert(
          { key: 'theme', value: updatedSettings, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        )
        .select()
        .single();

      if (error) throw error;
      return data.value as unknown as ThemeSettings;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      await revalidateSettingsCache();
    },
  });
}
