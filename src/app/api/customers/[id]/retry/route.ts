import { NextResponse } from 'next/server';
import type { ProvisionJobStatus } from '@/lib/engaz/types';
import { createServiceRoleClient, requireSuperAdmin } from '@/lib/supabase/server';
import { scheduleProvisionRun } from '@/server/provision/schedule-provision';

export const maxDuration = 60;

const ACTIVE_JOB_STATUSES: ProvisionJobStatus[] = [
  'queued',
  'cloning',
  'migrating',
  'seeding',
  'creating_admin',
  'configuring_git',
  'deploying',
];

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

  const { data: customer } = await db.from('customers').select('*').eq('id', id).maybeSingle();
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const status = String(customer.status);
  if (status !== 'failed' && status !== 'provisioning') {
    return NextResponse.json(
      { error: `Cannot retry while customer status is "${status}"` },
      { status: 409 }
    );
  }

  await db
    .from('provision_jobs')
    .update({
      status: 'failed',
      error_message: 'Superseded by manual retry',
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('customer_id', id)
    .in('status', ACTIVE_JOB_STATUSES);

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

  await db
    .from('customers')
    .update({ status: 'provisioning', updated_at: new Date().toISOString() })
    .eq('id', id);

  scheduleProvisionRun(job.id);
  return NextResponse.json({ jobId: job.id });
}
