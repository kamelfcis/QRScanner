export type PaymentMethod = 'cash' | 'card' | 'instapay';

export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'instapay'];

export function computeChangeDue(total: number, amountReceived: number): number {
  const received = Number(amountReceived);
  const due = Number(total);
  if (!Number.isFinite(received) || !Number.isFinite(due)) return 0;
  return Math.max(0, Math.round((received - due) * 100) / 100);
}

export function isValidCashReceived(total: number, amountReceived: number): boolean {
  return Number.isFinite(amountReceived) && amountReceived >= total;
}

export function parseAmountReceived(value: string): number | null {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100) / 100;
}
