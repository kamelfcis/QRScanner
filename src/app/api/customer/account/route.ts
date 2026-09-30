import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCustomerIdFromCookie } from '@/lib/customer/session';

export const runtime = 'nodejs';

export async function GET() {
  const customerId = await getCustomerIdFromCookie();
  if (!customerId) {
    return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('customer_get_account', {
    p_customer_id: customerId,
  });

  if (error) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const customerId = await getCustomerIdFromCookie();
  if (!customerId) {
    return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const displayName = typeof body?.display_name === 'string' ? body.display_name.trim() : '';
  if (!displayName || displayName.length > 200) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('customer_update_name', {
    p_customer_id: customerId,
    p_display_name: displayName,
  });

  if (error) {
    return NextResponse.json({ error: 'update_failed' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
