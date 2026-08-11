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
  const { data: customer, error } = await auth.supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const { data: jobs } = await auth.supabase
    .from('provision_jobs')
    .select('*')
    .eq('customer_id', id)
    .order('created_at', { ascending: false });

  const latestJob = jobs?.[0];
  let events: unknown[] = [];
  if (latestJob) {
    const { data } = await auth.supabase
      .from('provision_job_events')
      .select('*')
      .eq('job_id', latestJob.id)
      .order('created_at', { ascending: true });
    events = data || [];
  }

  const { data: admins } = await auth.supabase
    .from('customer_admins')
    .select('id, email, supabase_user_id, created_at')
    .eq('customer_id', id);

  return NextResponse.json({
    customer,
    jobs: jobs || [],
    latestJob: latestJob || null,
    events,
    admins: admins || [],
  });
}
