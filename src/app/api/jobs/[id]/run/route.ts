import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { runProvisionJob } from '@/server/provision/runner';

export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

function authorizeRunner(request: Request): boolean {
  const secret = env.ENGAZ_SECRETS_KEY;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function POST(request: Request, ctx: Ctx) {
  if (!authorizeRunner(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;

  try {
    const result = await runProvisionJob(id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[provision] run failed', id, message);
    return NextResponse.json({ error: message, continued: false }, { status: 500 });
  }
}
