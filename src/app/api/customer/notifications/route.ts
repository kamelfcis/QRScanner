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
  const { data, error } = await supabase.rpc('customer_get_notifications', {
    p_customer_id: customerId,
  });

  if (error) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 400 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const customerId = await getCustomerIdFromCookie();
  if (!customerId) {
    return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const notificationId = body?.notification_id as string | undefined;
  if (!notificationId) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('customer_mark_notification_read', {
    p_customer_id: customerId,
    p_notification_id: notificationId,
  });

  if (error) {
    return NextResponse.json({ error: 'update_failed' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
