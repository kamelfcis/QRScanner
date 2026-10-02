/** Returns true when at least one proof field is provided. */
export function hasInstapayProof(ref?: string | null, screenshotUrl?: string | null): boolean {
  return Boolean(ref?.trim()) || Boolean(screenshotUrl?.trim());
}

/** Unique checkout payment reference: MS-{timestamp}-{4chars} */
export function generateOrderPaymentRef(): string {
  const timestamp = Date.now();
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MS-${timestamp}-${suffix}`;
}
