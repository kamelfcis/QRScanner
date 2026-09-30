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
  const { data, error } = await supabase.rpc('customer_get_offers', {
    p_customer_id: customerId,
  });

  if (error) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 400 });
  }

  return NextResponse.json(data ?? []);
}
