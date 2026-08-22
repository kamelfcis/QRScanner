import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveCountryCode } from '@/lib/phone/country-dial';
import { normalizeLocalPhone } from '@/lib/phone/normalize';
import { placeOrderSchema } from '@/types/schema';

export const runtime = 'nodejs';

const ERROR_STATUS: Record<string, number> = {
  feature_disabled: 403,
  rate_limited: 429,
  empty_cart: 400,
  name_required: 400,
  address_required: 400,
  notes_too_long: 400,
  min_order: 400,
  product_unavailable: 409,
  invalid_payload: 400,
  invalid_coupon: 400,
  expired: 400,
  inactive: 400,
  usage_exhausted: 400,
  phone_limit: 400,
};

function jsonError(error: string, status: number, code?: string) {
  return NextResponse.json(code ? { error, code } : { error }, { status });
}

function getCountryFromRequest(request: Request): string {
  const vercel = request.headers.get('x-vercel-ip-country')?.trim();
  if (vercel && vercel !== 'XX') return resolveCountryCode(vercel);

  const cf = request.headers.get('cf-ipcountry')?.trim();
  if (cf && cf !== 'XX') return resolveCountryCode(cf);

  return resolveCountryCode(null);
}

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = request.headers.get('x-real-ip')?.trim();
  return real ? real.slice(0, 64) : null;
}

function extractRpcCode(message: string | undefined): string | null {
  if (!message) return null;
  const known = Object.keys(ERROR_STATUS);
  return known.find((code) => message.includes(code)) ?? null;
}

async function isDashboardOrdersEnabled(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'features')
    .maybeSingle();

  if (error) return false;
  const value = data?.value as { dashboard_orders?: boolean } | undefined;
  return value?.dashboard_orders === true;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    if (!(await isDashboardOrdersEnabled(supabase))) {
      return jsonError('Order board is not enabled', 403, 'feature_disabled');
    }

    const body = await request.json().catch(() => null);
    const parsed = placeOrderSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Invalid order payload', 400, 'invalid_payload');
    }

    const phoneCountry = resolveCountryCode(
      parsed.data.phone_country ?? getCountryFromRequest(request)
    );
    const customerPhone = parsed.data.customer_phone
      ? normalizeLocalPhone(parsed.data.customer_phone, phoneCountry)
      : null;

    const { data, error } = await supabase.rpc('place_customer_order', {
      payload: {
        ...parsed.data,
        customer_phone: customerPhone,
        client_ip: getClientIp(request),
      },
    });

    if (error) {
      const code = extractRpcCode(error.message) ?? 'invalid_payload';
      return jsonError(error.message || 'Failed to place order', ERROR_STATUS[code] ?? 400, code);
    }

    return NextResponse.json(data);
  } catch {
    return jsonError('Failed to place order', 500);
  }
}
