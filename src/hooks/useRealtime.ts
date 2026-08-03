'use client';

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { analyticsKeys } from './useAnalytics';
import { dashboardKeys } from './useDashboardStats';

export function useRealtimeAnalytics() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  }, [queryClient]);

  useEffect(() => {
    const channel = supabase
      .channel('analytics-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'analytics' },
        () => {
          invalidateAll();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'search_analytics' },
        () => {
          invalidateAll();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, invalidateAll, queryClient]);
}
