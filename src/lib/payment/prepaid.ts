export type PaymentMethod = 'instapay' | 'vodafone_cash';
export type PrepaidScope = 'shipping_only' | 'full';

export interface PrepaidAmounts {
  productsTotal: number;
  deliveryFee: number;
  grandTotal: number;
  amountDue: number;
  remainingOnDelivery: number;
}

export interface ConfiguredPaymentMethods {
  /** Link or handle shown at checkout. Database value wins over the env fallback. */
  instapayValue: string;
  /** Wallet number as stored, with surrounding whitespace removed. */
  vodafoneNumber: string;
  methods: PaymentMethod[];
}

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Amount the customer must transfer now, from catalog products and the zone fee. */
export function computePrepaidAmounts(
  productsTotal: number,
  deliveryFee: number,
  scope: PrepaidScope
): PrepaidAmounts {
  const products = roundMoney(Math.max(0, productsTotal));
  const fee = roundMoney(Math.max(0, deliveryFee));
  const grandTotal = roundMoney(products + fee);

  if (scope === 'full') {
    return {
      productsTotal: products,
      deliveryFee: fee,
      grandTotal,
      amountDue: grandTotal,
      remainingOnDelivery: 0,
    };
  }

  return {
    productsTotal: products,
    deliveryFee: fee,
    grandTotal,
    amountDue: fee,
    remainingOnDelivery: products,
  };
}

/**
 * Dashboard settings are the source of truth.
 * `envInstapayUrl` is used only when the database link is empty.
 * The InstaPay handle env var is intentionally not read.
 */
export function resolveConfiguredPaymentMethods(input: {
  instapayPaymentUrl?: string | null;
  vodafoneCashNumber?: string | null;
  envInstapayUrl?: string | null;
}): ConfiguredPaymentMethods {
  const fromDatabase = input.instapayPaymentUrl?.trim() ?? '';
  const instapayValue = fromDatabase || input.envInstapayUrl?.trim() || '';
  const vodafoneNumber = input.vodafoneCashNumber?.trim() ?? '';
  const methods: PaymentMethod[] = [];
  if (instapayValue) methods.push('instapay');
  if (vodafoneNumber) methods.push('vodafone_cash');
  return { instapayValue, vodafoneNumber, methods };
}

/** Vodafone Cash when a wallet is saved, otherwise InstaPay. */
export function defaultPaymentMethod(
  methods: readonly PaymentMethod[],
  vodafoneNumber: string
): PaymentMethod | null {
  if (vodafoneNumber.trim() && methods.includes('vodafone_cash')) return 'vodafone_cash';
  if (methods.includes('instapay')) return 'instapay';
  return methods[0] ?? null;
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return value === 'instapay' || value === 'vodafone_cash';
}

export function isPrepaidScope(value: string): value is PrepaidScope {
  return value === 'shipping_only' || value === 'full';
}

export function isPaymentLink(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Egyptian mobile, including Vodafone (010), Orange (012), Etisalat (011), and WE (015). */
export function isEgyptMobileNumber(value: string): boolean {
  const compact = value.trim().replace(/[\s()-]/g, '');
  if (!compact) return false;
  return /^(?:\+20|0020|20|0)?1[0125]\d{8}$/.test(compact);
}

export function canSubmitPaymentProof(input: {
  proofRequired: boolean;
  screenshotUrl?: string | null;
  uploading: boolean;
}): boolean {
  if (!input.proofRequired) return true;
  if (input.uploading) return false;
  return Boolean(input.screenshotUrl?.trim());
}

export function paymentProofBlockReason(
  proofRequired: boolean,
  screenshotUrl?: string | null
): 'instapay_proof_required' | null {
  if (!proofRequired) return null;
  if (!screenshotUrl?.trim()) return 'instapay_proof_required';
  return null;
}

export interface DeliveryProofRecordInput {
  orderRef: string;
  customerName: string;
  customerPhone: string | null;
  deliveryLocationId: string | null;
  screenshotUrl: string | null;
  amountNote: string | null;
  paymentMethod: PaymentMethod;
  prepaidScope: PrepaidScope;
  productsTotal: number;
  deliveryFee: number;
  amountDue: number;
  remainingOnDelivery: number;
  markWhatsAppSent?: boolean;
}

export function buildDeliveryProofRecord(input: DeliveryProofRecordInput) {
  return {
    order_ref: input.orderRef,
    customer_name: input.customerName,
    customer_phone: input.customerPhone,
    delivery_location_id: input.deliveryLocationId,
    delivery_fee: input.deliveryFee,
    products_total: input.productsTotal,
    amount_due: input.amountDue,
    remaining_on_delivery: input.remainingOnDelivery,
    payment_method: input.paymentMethod,
    prepaid_scope: input.prepaidScope,
    proof_reference: null,
    screenshot_url: input.screenshotUrl,
    amount_note: input.amountNote,
    status: 'pending' as const,
    ...(input.markWhatsAppSent ? { whatsapp_sent_at: new Date().toISOString() } : {}),
  };
}
