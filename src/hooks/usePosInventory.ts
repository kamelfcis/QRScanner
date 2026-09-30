'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAdminQueryEnabled } from './useAdminQueryEnabled';

const supabase = createClient();

export interface StockItemRow {
  id: string;
  name_ar: string;
  name_en: string;
  sku: string | null;
  unit: string;
  product_id: string | null;
  track_stock: boolean;
  avg_cost: number;
  stock_levels?: { qty: number; warehouse_id: string }[];
}

export interface SupplierRow {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
  notes: string | null;
  created_at: string;
}

export interface RecipeRow {
  id: string;
  product_id: string;
  yield_qty: number;
  notes: string | null;
  recipe_lines?: { id: string; stock_item_id: string; qty: number }[];
}

export const posInventoryKeys = {
  stock: ['pos-stock-items'] as const,
  suppliers: ['pos-suppliers'] as const,
  recipes: ['pos-recipes'] as const,
  purchases: ['pos-purchases'] as const,
  productOffers: ['pos-product-offers'] as const,
  loyalty: ['pos-loyalty-settings'] as const,
};

export function useStockItems(enabled = true) {
  const adminEnabled = useAdminQueryEnabled();
  return useQuery({
    queryKey: posInventoryKeys.stock,
    enabled: adminEnabled && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*, stock_levels(qty, warehouse_id)')
        .order('name_en');
      if (error) throw error;
      return (data ?? []) as StockItemRow[];
    },
  });
}

export function useSuppliers(enabled = true) {
  const adminEnabled = useAdminQueryEnabled();
  return useQuery({
    queryKey: posInventoryKeys.suppliers,
    enabled: adminEnabled && enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('*').order('name');
      if (error) throw error;
      return (data ?? []) as SupplierRow[];
    },
  });
}

export function useSupplier(id: string | null, enabled = true) {
  const adminEnabled = useAdminQueryEnabled();
  return useQuery({
    queryKey: [...posInventoryKeys.suppliers, id],
    enabled: adminEnabled && enabled && Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('*').eq('id', id!).single();
      if (error) throw error;
      return data as SupplierRow;
    },
  });
}

export function useRecipes(enabled = true) {
  const adminEnabled = useAdminQueryEnabled();
  return useQuery({
    queryKey: posInventoryKeys.recipes,
    enabled: adminEnabled && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*, recipe_lines(id, stock_item_id, qty)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as RecipeRow[];
    },
  });
}

export function usePurchaseInvoices(enabled = true) {
  const adminEnabled = useAdminQueryEnabled();
  return useQuery({
    queryKey: posInventoryKeys.purchases,
    enabled: adminEnabled && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select('*, suppliers(name)')
        .order('invoice_date', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProductOffers(enabled = true) {
  const adminEnabled = useAdminQueryEnabled();
  return useQuery({
    queryKey: posInventoryKeys.productOffers,
    enabled: adminEnabled && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_offers')
        .select('*, products(name_en, name_ar)')
        .order('starts_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePostPurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase.rpc('pos_post_purchase', { p_payload: payload });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: posInventoryKeys.stock });
      qc.invalidateQueries({ queryKey: posInventoryKeys.suppliers });
      qc.invalidateQueries({ queryKey: posInventoryKeys.purchases });
    },
  });
}

export function useSupplierPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase.rpc('pos_supplier_payment', { p_payload: payload });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: posInventoryKeys.suppliers });
      qc.invalidateQueries({ queryKey: posInventoryKeys.purchases });
    },
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase.rpc('pos_adjust_stock', { p_payload: payload });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: posInventoryKeys.stock });
    },
  });
}
