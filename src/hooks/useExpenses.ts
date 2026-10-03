'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAdminQueryEnabled } from './useAdminQueryEnabled';
import { hasDailyOps } from '@/i18n/config';

export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  expense_date: string;
  created_by: string | null;
  created_at: string;
}

export interface ExpenseInput {
  amount: number;
  category: string;
  description?: string | null;
  expense_date: string;
}

export const expenseKeys = {
  all: ['expenses'] as const,
  month: (year: number, month: number) => [...expenseKeys.all, year, month] as const,
  range: (from: string, to: string) => [...expenseKeys.all, 'range', from, to] as const,
};

function monthBounds(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

async function fetchExpensesInRange(from: string, to: string): Promise<Expense[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('expense_date', from)
    .lte('expense_date', to)
    .order('expense_date', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    amount: Number(row.amount),
  })) as Expense[];
}

export function useExpensesForMonth(year: number, month: number) {
  const adminEnabled = useAdminQueryEnabled();
  const { from, to } = monthBounds(year, month);

  return useQuery({
    queryKey: expenseKeys.month(year, month),
    queryFn: () => fetchExpensesInRange(from, to),
    enabled: adminEnabled && hasDailyOps,
  });
}

export function useExpensesForRange(from: string, to: string, enabled = true) {
  const adminEnabled = useAdminQueryEnabled();

  return useQuery({
    queryKey: expenseKeys.range(from, to),
    queryFn: () => fetchExpensesInRange(from, to),
    enabled: adminEnabled && hasDailyOps && enabled && Boolean(from && to),
  });
}

export function sumExpenses(expenses: Expense[] | undefined): number {
  return (expenses ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ExpenseInput) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('expenses')
        .insert({
          amount: input.amount,
          category: input.category,
          description: input.description ?? null,
          expense_date: input.expense_date,
          created_by: user?.id ?? null,
        })
        .select('*')
        .single();

      if (error) throw error;
      return { ...data, amount: Number(data.amount) } as Expense;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: ExpenseInput & { id: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('expenses')
        .update({
          amount: input.amount,
          category: input.category,
          description: input.description ?? null,
          expense_date: input.expense_date,
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return { ...data, amount: Number(data.amount) } as Expense;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}
