import { isEcommerceStore } from '@/lib/store-config';

export const instapayPaymentUrl = process.env.NEXT_PUBLIC_INSTAPAY_URL?.trim() || '';
export const instapayHandle =
  process.env.NEXT_PUBLIC_INSTAPAY_HANDLE?.trim() || 'mazenmohamed001@instapay';
export const showInstapayDeliveryPrepay = isEcommerceStore && instapayPaymentUrl.length > 0;
