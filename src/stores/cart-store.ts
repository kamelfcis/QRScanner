'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { playSound } from '@/lib/ux/sound';
import { triggerHaptic } from '@/lib/ux/haptic';
import { maxAddableQuantity, sizeCartKey } from '@/lib/catalog/ecommerce-sizes';
import type { SelectedSizeSnapshot } from '@/types/database';
import { defaultDiningMode, isEcommerceStore } from '@/lib/store-config';

export type CartDiningMode = 'dining' | 'takeaway';
export type FulfillmentType = 'delivery' | 'pickup';
export type CartSizeOption = 'small' | 'medium' | 'large' | 'family' | null;

export interface CartItem {
  /** Stable line id: productId + notes key */
  id: string;
  productId: string;
  name_en: string;
  name_ar: string;
  name_fr?: string | null;
  name_nl?: string | null;
  image_url: string | null;
  dining_price: number;
  takeaway_price: number;
  has_size_options?: boolean;
  price_per_kg?: number | null;
  weight_options_g?: number[] | null;
  sizeOption?: CartSizeOption;
  sizeCode?: string | null;
  selectedSize?: SelectedSizeSnapshot | null;
  weightGrams?: number | null;
  /** Null or omitted means unlimited. A number caps this product across cart lines. */
  stockQty?: number | null;
  quantity: number;
  notes: string;
}

export interface CartMeta {
  diningMode: CartDiningMode;
  tableNumber: string | null;
  fulfillmentType: FulfillmentType;
  deliveryAddress: string;
  deliveryLocationId: string | null;
  deliveryAddressDetails: string;
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
  weightGrams: number | null = null,
  sizeCode: string | null = null
): string {
  const key = notesKey(notes);
  const sizeKey = sizeCartKey(sizeCode);
  const weightKey = weightGrams != null ? `${weightGrams}g` : '';
  const parts = [productId, sizeKey, weightKey, key].filter(Boolean);
  return parts.join('::');
}

const initialMeta: CartMeta = {
  diningMode: defaultDiningMode,
  tableNumber: null,
  fulfillmentType: isEcommerceStore ? 'delivery' : 'pickup',
  deliveryAddress: '',
  deliveryLocationId: null,
  deliveryAddressDetails: '',
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
        const requested = Math.max(1, item.quantity ?? 1);
        const notes = item.notes?.trim() ?? '';
        const weightGrams = item.weightGrams ?? null;
        const sizeCode = item.sizeCode ?? null;
        const id = makeCartLineId(item.productId, notes, weightGrams, sizeCode);
        const current = get().items;
        const existing = current.find((i) => i.id === id);
        const resolvedStock =
          item.stockQty !== undefined ? item.stockQty : (existing?.stockQty ?? null);
        const allocated = current
          .filter((i) => i.productId === item.productId)
          .reduce((sum, i) => sum + i.quantity, 0);
        const room = maxAddableQuantity(resolvedStock, allocated);
        if (room != null && room <= 0) return;
        const addQty = room == null ? requested : Math.min(requested, room);
        triggerHaptic('light');
        playSound('add');
        set((state) => {
          const line = state.items.find((i) => i.id === id);
          if (line) {
            return {
              items: state.items.map((i) =>
                i.id === id ? { ...i, quantity: i.quantity + addQty, stockQty: resolvedStock } : i
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
                name_fr: item.name_fr,
                name_nl: item.name_nl,
                image_url: item.image_url,
                dining_price: item.dining_price,
                takeaway_price: item.takeaway_price,
                has_size_options: item.has_size_options,
                price_per_kg: item.price_per_kg ?? null,
                weight_options_g: item.weight_options_g ?? null,
                sizeOption: item.sizeOption ?? null,
                sizeCode,
                selectedSize: item.selectedSize ?? null,
                weightGrams,
                stockQty: resolvedStock,
                quantity: addQty,
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
        set((state) => {
          const current = state.items.find((i) => i.id === id);
          if (!current) return state;
          const others = state.items
            .filter((i) => i.productId === current.productId && i.id !== id)
            .reduce((sum, i) => sum + i.quantity, 0);
          const room = maxAddableQuantity(current.stockQty, others);
          const next = room == null ? quantity : Math.min(quantity, room);
          if (next <= 0) return state;
          return {
            items: state.items.map((i) => (i.id === id ? { ...i, quantity: next } : i)),
          };
        });
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
            current.weightGrams ?? null,
            current.sizeCode ?? null
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
          fulfillmentType: isEcommerceStore ? 'delivery' : 'pickup',
          deliveryAddress: '',
          deliveryLocationId: null,
          deliveryAddressDetails: '',
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
        deliveryLocationId: state.deliveryLocationId,
        deliveryAddressDetails: state.deliveryAddressDetails,
        customerName: state.customerName,
        customerPhone: state.customerPhone,
        orderNotes: state.orderNotes,
      }),
    }
  )
);
