import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveCountryCode } from '@/lib/phone/country-dial';
import { normalizeLocalPhone } from '@/lib/phone/normalize';
import { couponPreviewSchema } from '@/types/schema';

export const runtime = 'nodejs';

const ERROR_STATUS: Record<string, number> = {
  feature_disabled: 403,
  rate_limited: 429,
  empty_cart: 400,
  product_unavailable: 409,
  invalid_payload: 400,
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

async function isCouponsEnabled(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'features')
    .maybeSingle();

  if (error) return false;
  const value = data?.value as { coupons?: boolean } | undefined;
  return value?.coupons === true;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    if (!(await isCouponsEnabled(supabase))) {
      return jsonError('Coupons are not enabled', 403, 'feature_disabled');
    }

    const body = await request.json().catch(() => null);
    const parsed = couponPreviewSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Invalid coupon payload', 400, 'invalid_payload');
    }

    const phoneCountry = resolveCountryCode(
      parsed.data.phone_country ?? getCountryFromRequest(request)
    );
    const customerPhone = parsed.data.customer_phone
      ? normalizeLocalPhone(parsed.data.customer_phone, phoneCountry)
      : null;

    const { data, error } = await supabase.rpc('preview_customer_coupon', {
      payload: {
        items: parsed.data.items,
        dining_mode: parsed.data.dining_mode,
        coupon_code: parsed.data.coupon_code,
        customer_phone: customerPhone,
        client_ip: getClientIp(request),
      },
    });

    if (error) {
      const code = extractRpcCode(error.message) ?? 'invalid_payload';
      return jsonError(
        error.message || 'Failed to preview coupon',
        ERROR_STATUS[code] ?? 400,
        code
      );
    }

    const preview = (data ?? {}) as {
      valid?: boolean;
      error?: string | null;
      code?: string | null;
      discount_type?: string | null;
      discount_value?: number | null;
      discount_amount?: number | null;
      subtotal?: number | null;
      tax?: number | null;
      service?: number | null;
      total?: number | null;
    };

    return NextResponse.json({
      valid: preview.valid === true,
      error: preview.error ?? null,
      code: preview.code ?? parsed.data.coupon_code,
      discount_type: preview.discount_type ?? null,
      discount_value: preview.discount_value ?? null,
      discount_amount: Number(preview.discount_amount ?? 0),
      subtotal: Number(preview.subtotal ?? 0),
      tax: Number(preview.tax ?? 0),
      service: Number(preview.service ?? 0),
      total: Number(preview.total ?? 0),
    });
  } catch {
    return jsonError('Failed to preview coupon', 500);
  }
}
