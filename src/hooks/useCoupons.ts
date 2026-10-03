'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAdminQueryEnabled } from './useAdminQueryEnabled';
import type { Coupon, CouponInput } from '@/types';

const supabase = createClient();

export const couponKeys = {
  all: ['coupons'] as const,
  lists: () => [...couponKeys.all, 'list'] as const,
};

export function useCoupons() {
  const enabled = useAdminQueryEnabled();

  return useQuery({
    queryKey: couponKeys.lists(),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CouponInput) => {
      const { data, error } = await supabase.from('coupons').insert(input).select().single();
      if (error) throw error;
      return data as Coupon;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponKeys.all });
    },
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CouponInput> }) => {
      const { data, error } = await supabase
        .from('coupons')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Coupon;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponKeys.all });
    },
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponKeys.all });
    },
  });
}

export function generateCouponCode(length = 8): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}
