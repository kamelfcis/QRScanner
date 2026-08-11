import { NextResponse } from 'next/server';
import { createServiceRoleClient, requireSuperAdmin } from '@/lib/supabase/server';
import { startProvisionJob } from '@/server/provision/runner';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const auth = await requireSuperAdmin();
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.error === 'unauthorized' ? 401 : 403 }
    );
  }

  const { id } = await ctx.params;
  const db = createServiceRoleClient();

  const { data: customer } = await db.from('customers').select('id').eq('id', id).maybeSingle();
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const { data: job, error } = await db
    .from('provision_jobs')
    .insert({
      customer_id: id,
      status: 'queued',
      current_step: 'queued',
    })
    .select('*')
    .single();

  if (error || !job) {
    return NextResponse.json({ error: error?.message || 'Failed to create job' }, { status: 500 });
  }

  startProvisionJob(job.id);
  return NextResponse.json({ jobId: job.id });
}
