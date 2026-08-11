import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/supabase/server';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const auth = await requireSuperAdmin();
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.error === 'unauthorized' ? 401 : 403 }
    );
  }

  const { id } = await ctx.params;
  const { data: job, error } = await auth.supabase
    .from('provision_jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const { data: events } = await auth.supabase
    .from('provision_job_events')
    .select('*')
    .eq('job_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ job, events: events || [] });
}
