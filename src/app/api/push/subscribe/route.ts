import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { hasHettSamakaTier3 } from '@/i18n/config';

export const runtime = 'nodejs';

const subscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(256),
  }),
});

function jsonError(error: string, status: number, code?: string) {
  return NextResponse.json(code ? { error, code } : { error }, { status });
}

export async function POST(request: Request) {
  try {
    if (!hasHettSamakaTier3) {
      return jsonError('Not found', 404, 'not_found');
    }

    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()) {
      return jsonError('Push is not configured', 503, 'vapid_missing');
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError('Unauthorized', 401, 'not_authenticated');
    }

    const body = await request.json().catch(() => null);
    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Invalid subscription', 400, 'invalid_payload');
    }

    const userAgent = request.headers.get('user-agent')?.slice(0, 512) ?? null;

    // INSERT-only RLS (no UPDATE): replace any existing row for this endpoint.
    await supabase.from('push_subscriptions').delete().eq('endpoint', parsed.data.endpoint);

    const { error } = await supabase.from('push_subscriptions').insert({
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      user_agent: userAgent,
    });

    if (error) {
      return jsonError('Failed to save subscription', 500);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError('Failed to save subscription', 500);
  }
}
