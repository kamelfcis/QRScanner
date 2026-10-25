import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  mergeSizeRows,
  validateSizeRowsForSave,
  type EcommerceProductSize,
} from '@/lib/catalog/ecommerce-sizes';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function normalizeRows(productId: string, rows: EcommerceProductSize[]): EcommerceProductSize[] {
  return rows.map((row, index) => ({
    product_id: productId,
    sort_order: row.sort_order ?? index,
    code: row.code.trim().toLowerCase(),
    label_ar: row.label_ar.trim(),
    label_en: row.label_en.trim(),
    price: Number(row.price),
    is_enabled: Boolean(row.is_enabled),
    is_sold_out: Boolean(row.is_sold_out),
  }));
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('product_sizes')
      .select('*')
      .eq('product_id', id)
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sizes: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id: productId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { sizes?: EcommerceProductSize[] };
    const incoming = Array.isArray(body.sizes) ? body.sizes : [];
    const merged = mergeSizeRows(incoming);
    const validationError = validateSizeRowsForSave(merged);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const rows = normalizeRows(productId, merged);

    const admin = createAdminClient();

    const { error: deleteError } = await admin
      .from('product_sizes')
      .delete()
      .eq('product_id', productId);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (rows.length > 0) {
      const { data, error: insertError } = await admin
        .from('product_sizes')
        .insert(rows)
        .select('*')
        .order('sort_order', { ascending: true });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      return NextResponse.json({ sizes: data ?? [] });
    }

    return NextResponse.json({ sizes: [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
