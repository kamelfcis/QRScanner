import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toRangeBounds } from '@/lib/order/delete-range';
import { deleteOrdersInRangeSchema } from '@/types/schema';

export const runtime = 'nodejs';

function jsonError(error: string, status: number, code?: string) {
  return NextResponse.json(code ? { error, code } : { error }, { status });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError('Unauthorized', 401);
    }

    const body = await request.json().catch(() => null);
    const parsed = deleteOrdersInRangeSchema.safeParse(body);
    if (!parsed.success) {
      const code = parsed.error.issues[0]?.message ?? 'invalid_payload';
      const status = code === 'range_too_wide' ? 400 : 400;
      return jsonError('Invalid delete range', status, code);
    }

    const { from, to, statuses } = parsed.data;
    const bounds = toRangeBounds(from, to);

    const { data, error } = await supabase.rpc('delete_orders_in_range', {
      p_from: bounds.p_from,
      p_to: bounds.p_to,
      p_statuses: statuses?.length ? statuses : null,
    });

    if (error) {
      const code = error.message.includes('unauthorized')
        ? 'unauthorized'
        : error.message.includes('invalid_range')
          ? 'invalid_range'
          : 'delete_failed';
      return jsonError(error.message || 'Failed to delete orders', 400, code);
    }

    const deletedCount =
      typeof data === 'object' && data !== null && 'deleted_count' in data
        ? Number((data as { deleted_count: number }).deleted_count)
        : 0;

    return NextResponse.json({ deleted_count: deletedCount });
  } catch {
    return jsonError('Failed to delete orders', 500);
  }
}
