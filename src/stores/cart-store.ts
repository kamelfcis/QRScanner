'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { haptic } from '@/lib/haptics';

export type CartDiningMode = 'dining' | 'takeaway';
export type FulfillmentType = 'delivery' | 'pickup';
export type CartSizeOption = 'small' | 'large' | null;

export interface CartItem {
  /** Stable line id: productId + optional size/weight + notes key */
  id: string;
  productId: string;
  name_en: string;
  name_ar: string;
  name_fr?: string | null;
  name_nl?: string | null;
  image_url: string | null;
  dining_price: number;
  takeaway_price: number;
  has_size_options: boolean;
  price_per_kg?: number | null;
  weight_options_g?: number[] | null;
  sizeOption: CartSizeOption;
  weightGrams?: number | null;
  quantity: number;
  notes: string;
}

export interface CartMeta {
  diningMode: CartDiningMode;
  tableNumber: string | null;
  fulfillmentType: FulfillmentType;
  deliveryAddress: string;
  customerName: string;
  customerPhone: string;
  orderNotes: string;
}

interface CartState extends CartMeta {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'quantity'> & { quantity?: number }) => void;
  updateQty: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  setItemNotes: (id: string, notes: string) => void;
  clear: () => void;
  setMeta: (meta: Partial<CartMeta>) => void;
  itemCount: () => number;
}

function notesKey(notes: string): string {
  return notes.trim().toLowerCase();
}

export function makeCartLineId(
  productId: string,
  notes: string,
  sizeOption: CartSizeOption = null,
  weightGrams: number | null = null
): string {
  const key = notesKey(notes);
  const weightKey = weightGrams != null ? `${weightGrams}g` : '';
  if (weightKey && sizeOption && key) return `${productId}::${weightKey}::${sizeOption}::${key}`;
  if (weightKey && sizeOption) return `${productId}::${weightKey}::${sizeOption}`;
  if (weightKey && key) return `${productId}::${weightKey}::${key}`;
  if (weightKey) return `${productId}::${weightKey}`;
  if (sizeOption && key) return `${productId}::${sizeOption}::${key}`;
  if (sizeOption) return `${productId}::${sizeOption}`;
  if (key) return `${productId}::${key}`;
  return productId;
}

const initialMeta: CartMeta = {
  diningMode: 'dining',
  tableNumber: null,
  fulfillmentType: 'pickup',
  deliveryAddress: '',
  customerName: '',
  customerPhone: '',
  orderNotes: '',
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      ...initialMeta,

      addItem: (item) => {
        const qty = Math.max(1, item.quantity ?? 1);
        const notes = item.notes?.trim() ?? '';
        const sizeOption = item.sizeOption ?? null;
        const weightGrams = item.weightGrams ?? null;
        const id = makeCartLineId(item.productId, notes, sizeOption, weightGrams);
        haptic.addToCart();
        set((state) => {
          const existing = state.items.find((i) => i.id === id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === id ? { ...i, quantity: i.quantity + qty } : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                id,
                productId: item.productId,
                name_en: item.name_en,
                name_ar: item.name_ar,
                image_url: item.image_url,
                dining_price: item.dining_price,
                takeaway_price: item.takeaway_price,
                has_size_options: item.has_size_options ?? false,
                price_per_kg: item.price_per_kg ?? null,
                weight_options_g: item.weight_options_g ?? null,
                sizeOption,
                weightGrams,
                quantity: qty,
                notes,
              },
            ],
          };
        });
      },

      updateQty: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        }));
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        }));
      },

      setItemNotes: (id, notes) => {
        const trimmed = notes.trim();
        set((state) => {
          const current = state.items.find((i) => i.id === id);
          if (!current) return state;

          const newId = makeCartLineId(
            current.productId,
            trimmed,
            current.sizeOption,
            current.weightGrams ?? null
          );
          if (newId === id) {
            return {
              items: state.items.map((i) => (i.id === id ? { ...i, notes: trimmed } : i)),
            };
          }

          const duplicate = state.items.find((i) => i.id === newId);
          const without = state.items.filter((i) => i.id !== id);
          if (duplicate) {
            return {
              items: without.map((i) =>
                i.id === newId
                  ? { ...i, quantity: i.quantity + current.quantity, notes: trimmed }
                  : i
              ),
            };
          }
          return {
            items: [...without, { ...current, id: newId, notes: trimmed }],
          };
        });
      },

      clear: () => {
        set({
          items: [],
          fulfillmentType: 'pickup',
          deliveryAddress: '',
          customerName: '',
          customerPhone: '',
          orderNotes: '',
        });
      },

      setMeta: (meta) => {
        set((state) => ({ ...state, ...meta }));
      },

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: 'warda-cart-v1',
      partialize: (state) => ({
        items: state.items,
        diningMode: state.diningMode,
        tableNumber: state.tableNumber,
        fulfillmentType: state.fulfillmentType,
        deliveryAddress: state.deliveryAddress,
        customerName: state.customerName,
        customerPhone: state.customerPhone,
        orderNotes: state.orderNotes,
      }),
    }
  )
);
