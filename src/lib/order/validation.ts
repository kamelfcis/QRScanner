export interface OrderValidationInput {
  customerName: string;
  customerPhone?: string | null;
  requiresCustomerPhone?: boolean;
  orderNotes?: string | null;
  itemNotes?: Array<string | null | undefined>;
  subtotal: number;
  minimumOrder?: number | null;
  maxOrderNotesLength?: number | null;
  whatsappConfigured: boolean;
  hasItems: boolean;
  /** When true, free-text delivery address is required (takeaway + delivery). */
  requiresDeliveryAddress?: boolean;
  deliveryAddress?: string | null;
  /** When true, delivery location is required (ecommerce / zone delivery). */
  requiresDeliveryLocation?: boolean;
  deliveryLocationId?: string | null;
  /** When true, customer must acknowledge InstaPay delivery fee prepayment. */
  requiresInstapayAcknowledgment?: boolean;
  instapayAcknowledged?: boolean;
}

export interface OrderValidationResult {
  valid: boolean;
  errors: string[];
}

export type OrderValidationErrorCode =
  | 'empty_cart'
  | 'whatsapp_missing'
  | 'name_required'
  | 'phone_required'
  | 'address_required'
  | 'min_order'
  | 'notes_too_long'
  | 'instapay_not_acknowledged';

export interface OrderValidationCodedResult {
  valid: boolean;
  codes: OrderValidationErrorCode[];
  minimumOrder?: number;
  maxNotesLength?: number;
}

export function validateOrder(input: OrderValidationInput): OrderValidationCodedResult {
  const codes: OrderValidationErrorCode[] = [];
  const maxLen = input.maxOrderNotesLength ?? 200;
  const minOrder = input.minimumOrder ?? 0;

  if (!input.hasItems) codes.push('empty_cart');
  if (!input.whatsappConfigured) codes.push('whatsapp_missing');
  if (!input.customerName?.trim()) codes.push('name_required');
  if (input.requiresCustomerPhone && !input.customerPhone?.trim()) {
    codes.push('phone_required');
  }
  if (input.requiresInstapayAcknowledgment && !input.instapayAcknowledged) {
    codes.push('instapay_not_acknowledged');
  }
  if (input.requiresDeliveryLocation && !input.deliveryLocationId?.trim()) {
    codes.push('address_required');
  } else if (input.requiresDeliveryAddress && !input.deliveryAddress?.trim()) {
    codes.push('address_required');
  }
  if (minOrder > 0 && input.subtotal < minOrder) {
    codes.push('min_order');
  }

  const notesToCheck = [input.orderNotes, ...(input.itemNotes ?? [])].filter(
    (n): n is string => typeof n === 'string' && n.length > 0
  );

  if (notesToCheck.some((n) => n.length > maxLen)) {
    codes.push('notes_too_long');
  }

  return {
    valid: codes.length === 0,
    codes,
    minimumOrder: minOrder,
    maxNotesLength: maxLen,
  };
}
