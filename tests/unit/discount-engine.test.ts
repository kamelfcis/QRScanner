import { describe, expect, it } from 'vitest';
import {
  DISCOUNT_ENGINE_SQL_GOLDENS,
  computeDiscountAmount,
  evaluateCheckoutDiscounts,
  evaluateDiscounts,
  type CartLine,
  type CartSnapshot,
  type CheckoutCouponRule,
  type DiscountRule,
} from '@/lib/order/discount-engine';

const NOW = new Date('2026-09-18T10:00:00.000Z');
const PAST = new Date('2026-01-01T00:00:00.000Z');

function cart(lines: CartLine[], extras?: Partial<CartSnapshot>): CartSnapshot {
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  return { lines, subtotal, now: NOW, ...extras };
}

function rule(partial: Partial<DiscountRule> & Pick<DiscountRule, 'id' | 'type'>): DiscountRule {
  return {
    value: 0,
    target: partial.type === 'free_shipping' ? 'shipping' : 'order',
    isStackable: false,
    startsAt: PAST,
    ...partial,
  };
}

describe('discount-engine', () => {
  it('applies a fixed order discount capped at subtotal', () => {
    const snapshot = cart([{ id: 'l1', productId: 'p1', quantity: 2, unitPrice: 20 }]);
    const discount = rule({
      id: 'fixed-15',
      type: 'fixed_amount',
      value: 15,
    });
    expect(computeDiscountAmount(snapshot, discount)).toBe(
      DISCOUNT_ENGINE_SQL_GOLDENS['fixed-order-15-on-40']
    );
    expect(evaluateDiscounts(snapshot, [discount]).totalDiscount).toBe(15);
  });

  it('applies BOGO buy-2-get-1 on the cheapest qualifying unit', () => {
    const snapshot = cart([
      { id: 'l1', productId: 'fish', quantity: 3, unitPrice: 10 },
    ]);
    const bogo = rule({
      id: 'bogo',
      type: 'bogo',
      target: 'line_item',
      bogoBuy: 2,
      bogoGet: 1,
    });
    expect(evaluateDiscounts(snapshot, [bogo]).totalDiscount).toBe(
      DISCOUNT_ENGINE_SQL_GOLDENS['bogo-buy2-get1-qty3']
    );
  });

  it('does not grant BOGO on a single-unit cart', () => {
    const snapshot = cart([{ id: 'l1', productId: 'fish', quantity: 1, unitPrice: 10 }]);
    const bogo = rule({
      id: 'bogo',
      type: 'bogo',
      target: 'line_item',
      bogoBuy: 1,
      bogoGet: 1,
    });
    expect(evaluateDiscounts(snapshot, [bogo]).totalDiscount).toBe(0);
  });

  it('evaluates tiered bulk as two stacked quantity-gated percentages', () => {
    const snapshot = cart([{ id: 'l1', productId: 'p1', quantity: 5, unitPrice: 20 }]);
    const ten = rule({
      id: 'bulk-10',
      type: 'percentage',
      value: 10,
      isStackable: true,
      minQuantity: 3,
    });
    const fifteen = rule({
      id: 'bulk-15',
      type: 'percentage',
      value: 15,
      isStackable: true,
      minQuantity: 5,
    });
    expect(evaluateDiscounts(snapshot, [ten, fifteen]).totalDiscount).toBe(
      DISCOUNT_ENGINE_SQL_GOLDENS['tiered-bulk-two-stackable-pct']
    );
  });

  it('resolves two competing line discounts by taking the higher exclusive amount', () => {
    const snapshot = cart([
      { id: 'fish', productId: 'fish', quantity: 1, unitPrice: 40 },
      { id: 'drink', productId: 'drink', quantity: 1, unitPrice: 10 },
    ]);
    const fishOff = rule({
      id: 'fish-20',
      type: 'percentage',
      value: 20,
      target: 'line_item',
      isStackable: false,
      entitledProductIds: ['fish'],
    });
    const drinkOff = rule({
      id: 'drink-10',
      type: 'percentage',
      value: 10,
      target: 'line_item',
      isStackable: false,
      entitledProductIds: ['drink'],
    });
    const result = evaluateDiscounts(snapshot, [drinkOff, fishOff]);
    expect(result.totalDiscount).toBe(DISCOUNT_ENGINE_SQL_GOLDENS['competing-line-exclusive-wins']);
    expect(result.applications).toHaveLength(1);
    expect(result.applications[0]?.discountId).toBe('fish-20');
  });

  it('lets a stackable line discount combine after a higher exclusive', () => {
    const snapshot = cart([
      { id: 'fish', productId: 'fish', quantity: 1, unitPrice: 40 },
      { id: 'drink', productId: 'drink', quantity: 1, unitPrice: 10 },
    ]);
    const fishOff = rule({
      id: 'fish-20',
      type: 'percentage',
      value: 20,
      isStackable: false,
      entitledProductIds: ['fish'],
    });
    const drinkOff = rule({
      id: 'drink-10',
      type: 'percentage',
      value: 10,
      isStackable: true,
      entitledProductIds: ['drink'],
    });
    expect(evaluateDiscounts(snapshot, [fishOff, drinkOff]).totalDiscount).toBe(9);
  });

  it('caps stacked percentages at the cart subtotal', () => {
    const snapshot = cart([{ id: 'l1', productId: 'p1', quantity: 1, unitPrice: 10 }]);
    const a = rule({ id: 'a', type: 'percentage', value: 80, isStackable: true });
    const b = rule({ id: 'b', type: 'percentage', value: 80, isStackable: true });
    expect(evaluateDiscounts(snapshot, [a, b]).totalDiscount).toBe(10);
  });

  it('applies a percentage cap via maxDiscountAmount', () => {
    const snapshot = cart([{ id: 'l1', productId: 'p1', quantity: 1, unitPrice: 200 }]);
    const pct = rule({
      id: 'pct',
      type: 'percentage',
      value: 50,
      maxDiscountAmount: 20,
    });
    expect(computeDiscountAmount(snapshot, pct)).toBe(20);
  });

  it('zeros free shipping when the cart has no shipping', () => {
    const snapshot = cart([{ id: 'l1', productId: 'p1', quantity: 1, unitPrice: 30 }]);
    const shipping = rule({ id: 'ship', type: 'free_shipping', value: 1 });
    expect(computeDiscountAmount(snapshot, shipping)).toBe(0);
    expect(computeDiscountAmount({ ...snapshot, shippingAmount: 12 }, shipping)).toBe(12);
  });

  it('skips expired and future-dated rules', () => {
    const snapshot = cart([{ id: 'l1', productId: 'p1', quantity: 1, unitPrice: 30 }]);
    const expired = rule({
      id: 'old',
      type: 'fixed_amount',
      value: 5,
      startsAt: new Date('2020-01-01T00:00:00.000Z'),
      endsAt: new Date('2020-02-01T00:00:00.000Z'),
    });
    const future = rule({
      id: 'soon',
      type: 'fixed_amount',
      value: 5,
      startsAt: new Date('2026-12-01T00:00:00.000Z'),
    });
    expect(evaluateDiscounts(snapshot, [expired, future]).totalDiscount).toBe(0);
  });
});

describe('evaluateCheckoutDiscounts', () => {
  const snapshot = cart([{ id: 'l1', productId: 'p1', quantity: 1, unitPrice: 100 }]);

  const autoTen: CheckoutCouponRule = {
    ...rule({ id: 'auto-10', type: 'percentage', value: 10, isStackable: true }),
    requiresCode: false,
  };
  const codeFiveExclusive: CheckoutCouponRule = {
    ...rule({ id: 'code-5', type: 'percentage', value: 5, isStackable: false }),
    requiresCode: true,
  };
  const codeTenStackable: CheckoutCouponRule = {
    ...rule({ id: 'code-10', type: 'percentage', value: 10, isStackable: true }),
    requiresCode: true,
  };
  const autoFixedFive: CheckoutCouponRule = {
    ...rule({ id: 'auto-5', type: 'fixed_amount', value: 5, isStackable: true }),
    requiresCode: false,
  };

  it('applies automatics when no code is present', () => {
    expect(evaluateCheckoutDiscounts({ cart: snapshot, rules: [autoTen] }).totalDiscount).toBe(10);
  });

  it('blocks automatics when the code is not stackable', () => {
    expect(
      evaluateCheckoutDiscounts({
        cart: snapshot,
        rules: [autoTen, codeFiveExclusive],
        codedRuleId: 'code-5',
      }).totalDiscount
    ).toBe(DISCOUNT_ENGINE_SQL_GOLDENS['code-exclusive-blocks-auto']);
  });

  it('stacks a stackable code with stackable automatics', () => {
    expect(
      evaluateCheckoutDiscounts({
        cart: snapshot,
        rules: [autoFixedFive, codeTenStackable],
        codedRuleId: 'code-10',
      }).totalDiscount
    ).toBe(DISCOUNT_ENGINE_SQL_GOLDENS['code-stackable-plus-auto']);
  });
});
