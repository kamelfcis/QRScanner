import { NextResponse } from 'next/server';
import { z } from 'zod';
import { decryptJson } from '@/lib/crypto/secrets';
import { getRegistrationLogoPublicUrl } from '@/lib/engaz/customer-logo';
import { isToggleableCustomerStatus } from '@/lib/engaz/status';
import type { CustomerStatus } from '@/lib/engaz/types';
import { createServiceRoleClient, requireSuperAdmin } from '@/lib/supabase/server';
import { syncVercelForCustomerStatus } from '@/server/provision/customer-status';
import {
  DeleteCustomerError,
  deleteCustomerRecord,
} from '@/server/provision/delete-customer';

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

  let menuSignedUrl: string | null = null;
  const service = createServiceRoleClient();
  if (customer.menu_path) {
    const { data: signed } = await service.storage
      .from('registration-menus')
      .createSignedUrl(customer.menu_path, 60 * 60);
    menuSignedUrl = signed?.signedUrl ?? null;
  }

  let merged = customer;
  if (!customer.owner_email && customer.status === 'draft' && !customer.production_url) {
    const { data: secretRow } = await service
      .from('customer_secrets')
      .select('ciphertext, iv, auth_tag')
      .eq('customer_id', id)
      .maybeSingle();
    if (secretRow) {
      try {
        const extras = decryptJson<{
          type?: string;
          ownerName?: string;
          email?: string;
          phone?: string;
          businessType?: string;
          address?: string;
          city?: string;
        }>({
          ciphertext: secretRow.ciphertext,
          iv: secretRow.iv,
          authTag: secretRow.auth_tag,
        });
        if (extras?.type === 'self_service_registration') {
          merged = {
            ...customer,
            registration_source: 'self_service',
            owner_name: extras.ownerName || null,
            owner_email: extras.email || null,
            owner_phone: extras.phone || null,
            business_type: extras.businessType || null,
            address: extras.address || null,
            city: extras.city || null,
          };
        }
      } catch {
        // Not an application payload (provisioned customer secrets).
      }
    }
  }

  return NextResponse.json({
    customer: {
      ...merged,
      logo_url: getRegistrationLogoPublicUrl(merged.logo_path),
    },
    jobs: jobs || [],
    latestJob: latestJob || null,
    events,
    admins: admins || [],
    menuSignedUrl,
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

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireSuperAdmin();
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.error === 'unauthorized' ? 401 : 403 }
    );
  }

  const { id } = await ctx.params;
  const { data: customer, error: fetchError } = await auth.supabase
    .from('customers')
    .select('id, status, logo_path, menu_path, vercel_project_id, git_branch')
    .eq('id', id)
    .single();

  if (fetchError || !customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  try {
    const result = await deleteCustomerRecord({
      id: customer.id,
      status: customer.status as CustomerStatus,
      logo_path: customer.logo_path,
      menu_path: customer.menu_path,
      vercel_project_id: customer.vercel_project_id,
      git_branch: customer.git_branch,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof DeleteCustomerError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Failed to delete customer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
