/** Build the customer-facing welcome URL embedded in table QR codes. */
export function buildWelcomeUrl(siteUrl: string, tableNumber?: number | null): string {
  const base = siteUrl.replace(/\/$/, '');
  const params = new URLSearchParams();
  if (tableNumber != null) {
    params.set('table', String(tableNumber));
  }
  const qs = params.toString();
  return qs ? `${base}/welcome?${qs}` : `${base}/welcome`;
}
