import { beforeEach, describe, expect, it } from 'vitest';
import { makeCartLineId, useCartStore } from '@/stores/cart-store';

const sample = {
  productId: 'p1',
  name_en: 'Shawarma',
  name_ar: 'شاورما',
  image_url: null,
  dining_price: 25,
  takeaway_price: 22,
  notes: '',
};

describe('makeCartLineId', () => {
  it('uses productId alone when notes empty', () => {
    expect(makeCartLineId('p1', '')).toBe('p1');
  });

  it('includes notes key so variants stay separate', () => {
    expect(makeCartLineId('p1', 'Extra garlic')).toBe('p1::extra garlic');
    expect(makeCartLineId('p1', 'Extra garlic')).not.toBe(makeCartLineId('p1', ''));
  });
});

describe('useCartStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useCartStore.setState({
      items: [],
      diningMode: 'dining',
      tableNumber: null,
      customerName: '',
      customerPhone: '',
      orderNotes: '',
    });
  });

  it('adds items and merges same product+notes', () => {
    useCartStore.getState().addItem({ ...sample, quantity: 1 });
    useCartStore.getState().addItem({ ...sample, quantity: 2 });
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(3);
  });

  it('keeps separate lines for different notes', () => {
    useCartStore.getState().addItem({ ...sample, notes: '' });
    useCartStore.getState().addItem({ ...sample, notes: 'No onions' });
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('updates quantity and removes at zero', () => {
    useCartStore.getState().addItem({ ...sample, quantity: 2 });
    const id = useCartStore.getState().items[0].id;
    useCartStore.getState().updateQty(id, 5);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
    useCartStore.getState().updateQty(id, 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('removes items and clears customer fields', () => {
    useCartStore.getState().addItem(sample);
    useCartStore.getState().setMeta({ customerName: 'Omar', orderNotes: 'x' });
    useCartStore.getState().clear();
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().customerName).toBe('');
    expect(useCartStore.getState().orderNotes).toBe('');
  });

  it('persists to localStorage under aklet-cart-v1', () => {
    useCartStore.getState().addItem({ ...sample, quantity: 1 });
    useCartStore.getState().setMeta({ diningMode: 'takeaway', tableNumber: '3' });
    const raw = localStorage.getItem('aklet-cart-v1');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.items).toHaveLength(1);
    expect(parsed.state.diningMode).toBe('takeaway');
    expect(parsed.state.tableNumber).toBe('3');
  });

  it('setItemNotes re-keys and can merge into existing line', () => {
    useCartStore.getState().addItem({ ...sample, notes: '', quantity: 1 });
    useCartStore.getState().addItem({ ...sample, notes: 'Spicy', quantity: 1 });
    const plainId = makeCartLineId('p1', '');
    useCartStore.getState().setItemNotes(plainId, 'Spicy');
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(2);
    expect(useCartStore.getState().items[0].notes).toBe('Spicy');
  });
});
