import { createHmac, timingSafeEqual } from 'crypto';

export const CUSTOMER_COOKIE_NAME = 'warda_customer_id';

function getSecret(): string {
  const secret =
    process.env.CUSTOMER_COOKIE_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!secret) throw new Error('Missing customer cookie secret');
  return secret;
}

export function signCustomerId(customerId: string): string {
  const sig = createHmac('sha256', getSecret()).update(customerId).digest('base64url');
  return `${customerId}.${sig}`;
}

export function verifyCustomerCookie(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf('.');
  if (dot <= 0) return null;
  const id = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = createHmac('sha256', getSecret()).update(id).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return id;
}
