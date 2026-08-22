export type DiningMode = 'dining' | 'takeaway';

export interface TotalsCartItem {
  quantity: number;
  unitPrice: number;
}

export interface TotalsSettings {
  tax_rate?: number | null;
  service_charge_rate?: number | null;
  apply_tax?: boolean | null;
  apply_service_charge?: boolean | null;
}

export type CouponDiscountType = 'percentage' | 'fixed';

export interface CouponDiscountInput {
  type: CouponDiscountType;
  value: number;
  maxDiscount?: number | null;
}

export interface OrderTotals {
  subtotal: number;
  discount: number;
  tax: number;
  service: number;
  total: number;
  taxRate: number;
  serviceRate: number;
  applyTax: boolean;
  applyService: boolean;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** One coupon on merchandise subtotal. Never exceeds subtotal. */
export function calculateCouponDiscount(
  subtotal: number,
  coupon?: CouponDiscountInput | null
): number {
  if (!coupon || coupon.value <= 0 || subtotal <= 0) return 0;

  let discount =
    coupon.type === 'percentage'
      ? roundMoney(subtotal * (coupon.value / 100))
      : roundMoney(coupon.value);

  if (coupon.maxDiscount != null && coupon.maxDiscount >= 0) {
    discount = Math.min(discount, roundMoney(coupon.maxDiscount));
  }

  return roundMoney(Math.max(0, Math.min(discount, subtotal)));
}

export function calculateOrderTotals(
  items: TotalsCartItem[],
  settings?: TotalsSettings | null,
  coupon?: CouponDiscountInput | null
): OrderTotals {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));
  const discount = calculateCouponDiscount(subtotal, coupon);
  const taxable = roundMoney(subtotal - discount);

  const applyTax = settings?.apply_tax !== false;
  const applyService = settings?.apply_service_charge !== false;
  const taxRate = settings?.tax_rate ?? 15;
  const serviceRate = settings?.service_charge_rate ?? 10;

  const tax = applyTax ? roundMoney(taxable * (taxRate / 100)) : 0;
  const service = applyService ? roundMoney(taxable * (serviceRate / 100)) : 0;
  const total = roundMoney(taxable + tax + service);

  return {
    subtotal,
    discount,
    tax,
    service,
    total,
    taxRate,
    serviceRate,
    applyTax,
    applyService,
  };
}

export function getUnitPrice(diningPrice: number, takeawayPrice: number, mode: DiningMode): number {
  return mode === 'takeaway' ? takeawayPrice : diningPrice;
}

export interface CartLinePricing {
  dining_price: number;
  takeaway_price: number;
  has_size_options?: boolean;
  sizeOption?: 'small' | 'large' | null;
}

export function getCartLineUnitPrice(item: CartLinePricing, diningMode: DiningMode): number {
  if (item.has_size_options && item.sizeOption === 'small') return item.dining_price;
  if (item.has_size_options && item.sizeOption === 'large') return item.takeaway_price;
  return getUnitPrice(item.dining_price, item.takeaway_price, diningMode);
}
