import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isToggleableCustomerStatus } from '@/lib/engaz/status';
import type { CustomerStatus } from '@/lib/engaz/types';
import { requireSuperAdmin } from '@/lib/supabase/server';
import { syncVercelForCustomerStatus } from '@/server/provision/customer-status';

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  status: z.enum(['live', 'archived']),
});

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

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireSuperAdmin();
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.error === 'unauthorized' ? 401 : 403 }
    );
  }

  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'status must be live or archived' }, { status: 400 });
  }

  const { data: customer, error: fetchError } = await auth.supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const nextStatus = parsed.data.status;
  if (customer.status === nextStatus) {
    return NextResponse.json({ customer, vercel: null, message: 'No change' });
  }

  const current = customer.status as CustomerStatus;
  if (!isToggleableCustomerStatus(current) && current !== 'failed') {
    return NextResponse.json(
      {
        error: `Cannot change status while customer is "${current}". Only live or archived customers can be toggled.`,
      },
      { status: 409 }
    );
  }

  try {
    const vercel = await syncVercelForCustomerStatus(
      {
        slug: customer.slug,
        vercel_project_id: customer.vercel_project_id,
        production_url: customer.production_url,
      },
      nextStatus
    );

    const { data: updated, error: updateError } = await auth.supabase
      .from('customers')
      .update({
        status: nextStatus,
        vercel_project_id: vercel.vercelProjectId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update customer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      customer: updated,
      vercel: {
        projectId: vercel.vercelProjectId,
        projectName: vercel.vercelProjectName,
        action: nextStatus === 'archived' ? 'paused' : 'unpaused',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Vercel sync failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
