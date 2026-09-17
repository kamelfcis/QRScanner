import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { hasHettSamakaTier3 } from '@/i18n/config';

export const runtime = 'nodejs';

const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
});

function jsonError(error: string, status: number, code?: string) {
  return NextResponse.json(code ? { error, code } : { error }, { status });
}

export async function POST(request: Request) {
  try {
    if (!hasHettSamakaTier3) {
      return jsonError('Not found', 404, 'not_found');
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError('Unauthorized', 401, 'not_authenticated');
    }

    const body = await request.json().catch(() => null);
    const parsed = unsubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Invalid subscription', 400, 'invalid_payload');
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', parsed.data.endpoint);

    if (error) {
      return jsonError('Failed to remove subscription', 500);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError('Failed to remove subscription', 500);
  }
}
