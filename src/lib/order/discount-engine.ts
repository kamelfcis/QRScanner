/**
 * Discount evaluation library (authoritative math for tests).
 *
 * Postgres RPCs remain the source of truth at checkout. This module is the
 * portable spec the SQL in `035_discount_engine_coupons.sql` is written to match.
 *
 * Stacking rules
 * --------------
 * 1. Inactive / out-of-window / below min cart / below min qty / no entitled
 *    lines → skip (amount 0).
 * 2. Amounts are computed on the original eligible line prices (not on a
 *    residual after earlier discounts), then the running total is capped at
 *    the cart subtotal so the order never goes negative.
 * 3. Sort eligible discounts: non-stackable first, then higher amount, then id.
 * 4. Automatic-only carts: after one non-stackable applies, further
 *    non-stackable rules are skipped; stackable rules may still apply.
 * 5. Coded coupon + automatics (checkout wire-up):
 *    - invalid code → fail (do not silently fall back to automatics)
 *    - code that is not stackable → code only
 *    - stackable code → code + only stackable automatics
 * 6. Percentage uses `maxDiscountAmount` as a cap. Fixed amounts cannot exceed
 *    the eligible (or cart) subtotal. BOGO gives the cheapest qualifying units
 *    free. `free_shipping` is implemented here but is not stored on coupons.
 *
 * Currency is restaurant major units (EGP), rounded to 2 decimals — not cents.
 */

export type DiscountType = 'percentage' | 'fixed_amount' | 'bogo' | 'free_shipping';

export type DiscountTarget = 'order' | 'line_item' | 'shipping';

export interface DiscountRule {
  id: string;
  type: DiscountType;
  /** Percentage 0–100, or fixed/shipping amount in major units. Unused for BOGO. */
  value: number;
  target: DiscountTarget;
  isStackable: boolean;
  minCartAmount?: number;
  minQuantity?: number;
  entitledProductIds?: string[];
  excludedProductIds?: string[];
  startsAt: Date;
  endsAt?: Date;
  maxDiscountAmount?: number;
  bogoBuy?: number;
  bogoGet?: number;
}

export interface CartLine {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CartSnapshot {
  lines: CartLine[];
  subtotal: number;
  shippingAmount?: number;
  now?: Date;
}

export interface DiscountApplication {
  discountId: string;
  amount: number;
  affectedLineIds: string[];
}

export interface DiscountEvaluation {
  applications: DiscountApplication[];
  totalDiscount: number;
}

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function lineQualifies(line: CartLine, rule: DiscountRule): boolean {
  if (rule.entitledProductIds && rule.entitledProductIds.length > 0) {
    if (!rule.entitledProductIds.includes(line.productId)) return false;
  }
  if (rule.excludedProductIds?.includes(line.productId)) return false;
  return true;
}

function eligibleLines(cart: CartSnapshot, rule: DiscountRule): CartLine[] {
  return cart.lines.filter((line) => lineQualifies(line, rule));
}

function eligibleQty(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

function eligibleSubtotal(lines: CartLine[]): number {
  return roundMoney(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
}

function isInWindow(rule: DiscountRule, now: Date): boolean {
  if (rule.startsAt.getTime() > now.getTime()) return false;
  if (rule.endsAt && rule.endsAt.getTime() <= now.getTime()) return false;
  return true;
}

function bogoAmount(lines: CartLine[], buy: number, get: number): number {
  const buyQty = Math.max(1, Math.floor(buy));
  const getQty = Math.max(1, Math.floor(get));
  const units: number[] = [];
  for (const line of lines) {
    for (let i = 0; i < line.quantity; i += 1) {
      units.push(line.unitPrice);
    }
  }
  if (units.length < buyQty + getQty) return 0;
  units.sort((a, b) => a - b);
  const freeCount = Math.floor(units.length / (buyQty + getQty)) * getQty;
  return roundMoney(units.slice(0, freeCount).reduce((sum, price) => sum + price, 0));
}

export function computeDiscountAmount(cart: CartSnapshot, rule: DiscountRule): number {
  const now = cart.now ?? new Date();
  if (!isInWindow(rule, now)) return 0;
  if (rule.minCartAmount != null && cart.subtotal < rule.minCartAmount) return 0;

  if (rule.type === 'free_shipping') {
    const shipping = roundMoney(cart.shippingAmount ?? 0);
    if (shipping <= 0) return 0;
    const capped = rule.maxDiscountAmount != null ? Math.min(shipping, rule.maxDiscountAmount) : shipping;
    return roundMoney(Math.min(capped, shipping));
  }

  const lines = eligibleLines(cart, rule);
  if (lines.length === 0) return 0;
  if (rule.minQuantity != null && rule.minQuantity > 0 && eligibleQty(lines) < rule.minQuantity) {
    return 0;
  }

  const entitled = eligibleSubtotal(lines);
  let amount = 0;

  if (rule.type === 'percentage') {
    amount = roundMoney(entitled * (rule.value / 100));
  } else if (rule.type === 'fixed_amount') {
    amount = roundMoney(Math.min(rule.value, entitled, cart.subtotal));
  } else if (rule.type === 'bogo') {
    amount = bogoAmount(lines, rule.bogoBuy ?? rule.minQuantity ?? 1, rule.bogoGet ?? rule.value ?? 1);
  }

  if (rule.maxDiscountAmount != null) {
    amount = Math.min(amount, rule.maxDiscountAmount);
  }

  return roundMoney(Math.max(0, Math.min(amount, cart.subtotal, entitled || cart.subtotal)));
}

function potentialSort(a: DiscountApplication & { isStackable: boolean }, b: DiscountApplication & { isStackable: boolean }) {
  if (a.isStackable !== b.isStackable) return a.isStackable ? 1 : -1;
  if (b.amount !== a.amount) return b.amount - a.amount;
  return a.discountId.localeCompare(b.discountId);
}

/**
 * Evaluate automatic (or pre-filtered) rules with skill stacking:
 * non-stackable first, then higher amount; one exclusive may still combine
 * with later stackable rules; total capped at subtotal.
 */
export function evaluateDiscounts(cart: CartSnapshot, discounts: DiscountRule[]): DiscountEvaluation {
  const now = cart.now ?? new Date();
  const potentials = discounts
    .map((rule) => {
      const amount = computeDiscountAmount({ ...cart, now }, rule);
      return {
        discountId: rule.id,
        amount,
        affectedLineIds: eligibleLines(cart, rule).map((line) => line.id),
        isStackable: rule.isStackable,
      };
    })
    .filter((item) => item.amount > 0)
    .sort(potentialSort);

  const applications: DiscountApplication[] = [];
  let nonStackableApplied = false;
  let remaining = roundMoney(Math.max(0, cart.subtotal));

  for (const item of potentials) {
    if (remaining <= 0) break;
    if (!item.isStackable && nonStackableApplied) continue;
    const appliedAmount = roundMoney(Math.min(item.amount, remaining));
    if (appliedAmount <= 0) continue;
    applications.push({
      discountId: item.discountId,
      amount: appliedAmount,
      affectedLineIds: item.affectedLineIds,
    });
    remaining = roundMoney(remaining - appliedAmount);
    if (!item.isStackable) nonStackableApplied = true;
  }

  const totalDiscount = roundMoney(applications.reduce((sum, item) => sum + item.amount, 0));
  return { applications, totalDiscount };
}

export interface CheckoutCouponRule extends DiscountRule {
  requiresCode: boolean;
}

export interface CheckoutDiscountInput {
  cart: CartSnapshot;
  rules: CheckoutCouponRule[];
  /** Guest-entered code coupon id, if any. Must already be resolved as valid. */
  codedRuleId?: string | null;
}

/**
 * Checkout combination: coded coupon (optional) + automatic `requiresCode=false` rules.
 */
export function evaluateCheckoutDiscounts(input: CheckoutDiscountInput): DiscountEvaluation {
  const { cart, rules, codedRuleId } = input;
  const automatics = rules.filter((rule) => !rule.requiresCode);

  if (!codedRuleId) {
    return evaluateDiscounts(cart, automatics);
  }

  const coded = rules.find((rule) => rule.id === codedRuleId);
  if (!coded) {
    return { applications: [], totalDiscount: 0 };
  }

  if (!coded.isStackable) {
    return evaluateDiscounts(cart, [coded]);
  }

  const stackableAutos = automatics.filter((rule) => rule.isStackable && rule.id !== coded.id);
  return evaluateDiscounts(cart, [coded, ...stackableAutos]);
}

/** Locked expected totals for SQL parity comments in migration 035. */
export const DISCOUNT_ENGINE_SQL_GOLDENS = {
  'bogo-buy2-get1-qty3': 10,
  'fixed-order-15-on-40': 15,
  'tiered-bulk-two-stackable-pct': 25,
  'competing-line-exclusive-wins': 8,
  'code-exclusive-blocks-auto': 5,
  'code-stackable-plus-auto': 15,
} as const;
