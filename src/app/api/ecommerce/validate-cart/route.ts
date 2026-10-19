import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  validateEcommerceCartItems,
  type EcommerceCartValidationItem,
} from '@/lib/catalog/validate-ecommerce-cart';
import { isEcommerceStore } from '@/lib/store-config';

export async function POST(request: Request) {
  if (!isEcommerceStore) {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  try {
    const body = (await request.json()) as { items?: EcommerceCartValidationItem[] };
    const items = Array.isArray(body.items) ? body.items : [];

    const supabase = createAdminClient();
    const result = await validateEcommerceCartItems(supabase, items);

    return NextResponse.json(result, { status: result.valid ? 200 : 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
