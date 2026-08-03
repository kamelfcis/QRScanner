'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { ImportJob } from '@/types';

const supabase = createClient();

export const importKeys = {
  all: ['import-jobs'] as const,
  lists: () => [...importKeys.all, 'list'] as const,
  detail: (id: string) => [...importKeys.all, 'detail', id] as const,
};

export function useImportJobs() {
  return useQuery({
    queryKey: importKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('import_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ImportJob[];
    },
  });
}

export function useImportJob(id: string) {
  return useQuery({
    queryKey: importKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as ImportJob;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'processing' || status === 'parsing' || status === 'importing') {
        return 2000;
      }
      return false;
    },
  });
}

export function useDeleteImportJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('import_jobs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: importKeys.all });
    },
  });
}
