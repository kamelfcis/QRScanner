export const COUPON_ERROR_CODES = [
  'invalid_coupon',
  'expired',
  'inactive',
  'min_order',
  'usage_exhausted',
  'phone_limit',
] as const;

export type CouponErrorCode = (typeof COUPON_ERROR_CODES)[number];

const MESSAGE_KEYS: Record<CouponErrorCode, string> = {
  invalid_coupon: 'couponInvalid',
  expired: 'couponExpired',
  inactive: 'couponInactive',
  min_order: 'couponMinOrder',
  usage_exhausted: 'couponUsageExhausted',
  phone_limit: 'couponPhoneLimit',
};

export function isCouponErrorCode(code: string | null | undefined): code is CouponErrorCode {
  return !!code && (COUPON_ERROR_CODES as readonly string[]).includes(code);
}

export function couponErrorMessageKey(code: string | null | undefined): string {
  if (isCouponErrorCode(code)) return MESSAGE_KEYS[code];
  return 'couponApplyFailed';
}
