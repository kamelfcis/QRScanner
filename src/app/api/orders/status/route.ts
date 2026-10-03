import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveCountryCode } from '@/lib/phone/country-dial';
import { digitsOnly, normalizeLocalPhone } from '@/lib/phone/normalize';
import { normalizeOrderQuery } from '@/lib/order/last-order';
import { asOrderStatus } from '@/lib/order/live-status';
import { customerOrderStatusSchema, orderDiningModeSchema } from '@/types/schema';

export const runtime = 'nodejs';

function jsonNotFound() {
  return NextResponse.json({ found: false });
}

function getCountryFromRequest(request: Request): string {
  const vercel = request.headers.get('x-vercel-ip-country')?.trim();
  if (vercel && vercel !== 'XX') return resolveCountryCode(vercel);

  const cf = request.headers.get('cf-ipcountry')?.trim();
  if (cf && cf !== 'XX') return resolveCountryCode(cf);

  return resolveCountryCode(null);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = customerOrderStatusSchema.safeParse(body);
    if (!parsed.success) return jsonNotFound();

    const orderNumber = normalizeOrderQuery(parsed.data.order_number);
    const phoneCountry = resolveCountryCode(
      parsed.data.phone_country ?? getCountryFromRequest(request)
    );
    const customerPhone =
      normalizeLocalPhone(parsed.data.customer_phone, phoneCountry) ||
      digitsOnly(parsed.data.customer_phone);

    if (!orderNumber || customerPhone.length < 8) return jsonNotFound();

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_customer_order_status', {
      p_order_number: orderNumber,
      p_phone: customerPhone,
    });

    if (error || !data || typeof data !== 'object') return jsonNotFound();

    const record = data as Record<string, unknown>;
    const liveNumber = normalizeOrderQuery(String(record.order_number ?? ''));
    const diningParsed = orderDiningModeSchema.safeParse(record.dining_mode);

    if (!liveNumber) return jsonNotFound();

    return NextResponse.json({
      found: true,
      order_number: liveNumber,
      status: asOrderStatus(record.status),
      updated_at:
        typeof record.updated_at === 'string' ? record.updated_at : new Date().toISOString(),
      dining_mode: diningParsed.success ? diningParsed.data : null,
    });
  } catch {
    return jsonNotFound();
  }
}
