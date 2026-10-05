'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { isValidInstapayReference } from '@/lib/payment/instapay-proof';
import { useAdminQueryEnabled } from './useAdminQueryEnabled';
import type { InstapayDeliveryProof, InstapayProofStatus } from '@/types';

const supabase = createClient();

export const instapayProofKeys = {
  all: ['instapay-proofs'] as const,
  list: (status?: InstapayProofStatus | 'all') =>
    [...instapayProofKeys.all, status ?? 'pending'] as const,
};

export function useInstapayProofs(status: InstapayProofStatus | 'all' = 'pending') {
  const enabled = useAdminQueryEnabled();

  return useQuery({
    queryKey: instapayProofKeys.list(status),
    enabled,
    queryFn: async () => {
      let query = supabase
        .from('instapay_delivery_proofs')
        .select('*')
        .order('created_at', { ascending: false });

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as InstapayDeliveryProof[];
    },
  });
}

export function useReviewInstapayProof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      proofReference,
    }: {
      id: string;
      status: Exclude<InstapayProofStatus, 'pending'>;
      proofReference?: string | null;
    }) => {
      if (status === 'confirmed' && !isValidInstapayReference(proofReference)) {
        throw new Error('Invalid or missing InstaPay transfer reference');
      }

      const { data, error } = await supabase
        .from('instapay_delivery_proofs')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as InstapayDeliveryProof;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: instapayProofKeys.all });
    },
  });
}
