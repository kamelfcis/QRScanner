'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type {
  Settings,
  RestaurantSettings,
  ThemeSettings,
  HoursSettings,
  FeatureSettings,
} from '@/types';

const supabase = createClient();

export const settingsKeys = {
  all: ['settings'] as const,
  restaurant: () => [...settingsKeys.all, 'restaurant'] as const,
  theme: () => [...settingsKeys.all, 'theme'] as const,
  hours: () => [...settingsKeys.all, 'hours'] as const,
  features: () => [...settingsKeys.all, 'features'] as const,
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
        .single();

      if (error) throw error;
      return (data as Settings).value as unknown as ThemeSettings;
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
        .single();

      if (error) throw error;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
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
        .single();

      if (readError) throw new Error('Failed to read current hours settings');

      const currentSettings = (existing?.value as unknown as HoursSettings) || {};
      const updatedSettings = { ...currentSettings, ...input };

      const { data, error } = await supabase
        .from('settings')
        .update({ value: updatedSettings, updated_at: new Date().toISOString() })
        .eq('key', 'hours')
        .select()
        .single();

      if (error) throw error;
      return data.value as unknown as HoursSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
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
        .single();

      if (readError) throw new Error('Failed to read current theme settings');

      const currentSettings = (existing?.value as unknown as ThemeSettings) || {};
      const updatedSettings = { ...currentSettings, ...input };

      const { data, error } = await supabase
        .from('settings')
        .update({ value: updatedSettings, updated_at: new Date().toISOString() })
        .eq('key', 'theme')
        .select()
        .single();

      if (error) throw error;
      return data.value as unknown as ThemeSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}
