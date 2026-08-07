export interface OrderValidationInput {
  customerName: string;
  orderNotes?: string | null;
  itemNotes?: Array<string | null | undefined>;
  subtotal: number;
  minimumOrder?: number | null;
  maxOrderNotesLength?: number | null;
  whatsappConfigured: boolean;
  hasItems: boolean;
}

export interface OrderValidationResult {
  valid: boolean;
  errors: string[];
}

export type OrderValidationErrorCode =
  'empty_cart' | 'whatsapp_missing' | 'name_required' | 'min_order' | 'notes_too_long';

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
