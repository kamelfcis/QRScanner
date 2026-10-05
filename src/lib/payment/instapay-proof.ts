export const INSTAPAY_REF_MIN = 6;
export const INSTAPAY_REF_MAX = 20;
export const INSTAPAY_REF_PATTERN = /^[A-Z0-9]{6,20}$/;

/** Trim and uppercase InstaPay transfer reference for storage and comparison. */
export function normalizeInstapayReference(raw?: string | null): string {
  return (raw ?? '').trim().toUpperCase();
}

/** Validate InstaPay transfer reference format (6–20 alphanumeric, uppercase). */
export function isValidInstapayReference(raw?: string | null): boolean {
  const normalized = normalizeInstapayReference(raw);
  if (!normalized || normalized === '.' || normalized === '-') return false;
  return INSTAPAY_REF_PATTERN.test(normalized);
}

/** Returns true when a valid InstaPay transfer reference is provided. */
export function hasInstapayProof(ref?: string | null, screenshotUrl?: string | null): boolean {
  void screenshotUrl;
  return isValidInstapayReference(ref);
}

/** Unique checkout payment reference: MS-{timestamp}-{4chars} */
export function generateOrderPaymentRef(): string {
  const timestamp = Date.now();
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MS-${timestamp}-${suffix}`;
}
