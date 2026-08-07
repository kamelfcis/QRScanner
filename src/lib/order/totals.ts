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

export interface OrderTotals {
  subtotal: number;
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

export function calculateOrderTotals(
  items: TotalsCartItem[],
  settings?: TotalsSettings | null
): OrderTotals {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));

  const applyTax = settings?.apply_tax !== false;
  const applyService = settings?.apply_service_charge !== false;
  const taxRate = settings?.tax_rate ?? 15;
  const serviceRate = settings?.service_charge_rate ?? 10;

  const tax = applyTax ? roundMoney(subtotal * (taxRate / 100)) : 0;
  const service = applyService ? roundMoney(subtotal * (serviceRate / 100)) : 0;
  const total = roundMoney(subtotal + tax + service);

  return {
    subtotal,
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
