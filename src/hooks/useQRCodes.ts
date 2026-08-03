'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { QrCode, QrCodeInput, QrCodeWithTable } from '@/types';

const supabase = createClient();

export const qrKeys = {
  all: ['qr-codes'] as const,
  lists: () => [...qrKeys.all, 'list'] as const,
  detail: (id: string) => [...qrKeys.all, 'detail', id] as const,
  byTable: (tableId: string) => [...qrKeys.all, 'table', tableId] as const,
};

export function useQRCodes() {
  return useQuery({
    queryKey: qrKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*, table:restaurant_tables(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as QrCodeWithTable[];
    },
  });
}

export function useQRCode(id: string) {
  return useQuery({
    queryKey: qrKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*, table:restaurant_tables(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as QrCodeWithTable;
    },
    enabled: !!id,
  });
}

export function useCreateQRCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: QrCodeInput) => {
      const { data, error } = await supabase
        .from('qr_codes')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as QrCode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qrKeys.all });
    },
  });
}

export function useUpdateQRCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<QrCodeInput> }) => {
      const { data, error } = await supabase
        .from('qr_codes')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as QrCode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qrKeys.all });
    },
  });
}

export function useDeleteQRCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('qr_codes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qrKeys.all });
    },
  });
}

export function useDuplicateQRCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (qr: QrCode) => {
      const { id, created_at, updated_at, ...rest } = qr;
      const { data, error } = await supabase
        .from('qr_codes')
        .insert({ ...rest, name: `${rest.name} (Copy)` })
        .select()
        .single();

      if (error) throw error;
      return data as QrCode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qrKeys.all });
    },
  });
}
