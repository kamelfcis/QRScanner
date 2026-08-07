'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Notification } from '@/types/database';
import type { NotificationInput } from '@/types/schema';
import { useAdminQueryEnabled } from './useAdminQueryEnabled';

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const,
};

export function useNotifications(limit: number = 20) {
  const enabled = useAdminQueryEnabled();

  return useQuery({
    queryKey: notificationKeys.lists(),
    enabled,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as Notification[];
    },
    staleTime: 10 * 1000,
  });
}

export function useUnreadNotifications() {
  const enabled = useAdminQueryEnabled();

  return useQuery({
    queryKey: notificationKeys.unread(),
    enabled,
    queryFn: async () => {
      const supabase = createClient();
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);
      if (error) throw error;
      return count || 0;
    },
    staleTime: 10 * 1000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useCreateNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NotificationInput) => {
      const supabase = createClient();
      const { data, error } = await supabase.from('notifications').insert(input).select().single();
      if (error) throw error;
      return data as Notification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
