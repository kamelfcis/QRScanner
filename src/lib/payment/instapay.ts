/**
 * Fallback InstaPay link when restaurant settings leave `instapay_payment_url` empty.
 * Do not read NEXT_PUBLIC_INSTAPAY_HANDLE. The dashboard value is the source of truth.
 */
export const instapayPaymentUrl = process.env.NEXT_PUBLIC_INSTAPAY_URL?.trim() || '';
