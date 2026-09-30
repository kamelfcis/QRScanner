import { NextResponse } from 'next/server';
import { encryptJson, encryptSecret, generatePassword } from '@/lib/crypto/secrets';
import { TEMPLATE_CONFIGS } from '@/lib/engaz/types';
import { requireServerSecrets } from '@/lib/env';
import { createServiceRoleClient, requireSuperAdmin } from '@/lib/supabase/server';
import { prepareProvisionInput } from '@/server/provision/prepare-input';
import { scheduleProvisionRun } from '@/server/provision/schedule-provision';

export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireSuperAdmin();
  if (auth.error === 'unauthorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (auth.error === 'forbidden') {
    return NextResponse.json({ error: 'Forbidden — not a super admin' }, { status: 403 });
  }

  const platform = requireServerSecrets();
  if (!platform.ok) {
    return NextResponse.json(
      { error: 'Platform credentials incomplete', missing: platform.missing },
      { status: 503 }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    console.error('[provision] rejected request: body was not valid JSON');
    return NextResponse.json(
      { error: 'Provision request body was not valid JSON' },
      { status: 400 }
    );
  }

  const prepared = prepareProvisionInput(json);
  if (!prepared.ok) {
    console.error('[provision] rejected request:', prepared.error);
    return NextResponse.json({ error: prepared.error }, { status: 400 });
  }

  const input = prepared.data;
  const db = createServiceRoleClient();

  let existing: Record<string, unknown> | null = null;
  if (input.customerId) {
    const { data } = await db
      .from('customers')
      .select('*')
      .eq('id', input.customerId)
      .maybeSingle();
    existing = data;
  }
  if (!existing) {
    const { data } = await db.from('customers').select('*').eq('slug', input.slug).maybeSingle();
    existing = data;
  }

  let customer = existing;
  if (existing) {
    const status = String(existing.status ?? '');
    const source = String(existing.registration_source ?? '');
    const canReuseDraft =
      (status === 'draft' || status === 'failed') &&
      (source === 'self_service' || source === 'admin');
    if (!canReuseDraft) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }

    if (String(existing.slug) !== input.slug) {
      const { data: slugOwner } = await db
        .from('customers')
        .select('id')
        .eq('slug', input.slug)
        .neq('id', String(existing.id))
        .maybeSingle();
      if (slugOwner) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
      }
    }

    const { data: updated, error: updErr } = await db
      .from('customers')
      .update({
        slug: input.slug,
        display_name_ar: input.displayNameAr,
        display_name_en: input.displayNameEn,
        template_type: input.templateType,
        git_branch: input.slug,
        supabase_project_ref: input.secrets.supabaseProjectRef,
        created_by: auth.user!.id,
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (updErr || !updated) {
      return NextResponse.json(
        { error: updErr?.message || 'Failed to update draft customer' },
        { status: 500 }
      );
    }
    customer = updated;
  } else {
    const { data: inserted, error: custErr } = await db
      .from('customers')
      .insert({
        slug: input.slug,
        display_name_ar: input.displayNameAr,
        display_name_en: input.displayNameEn,
        template_type: input.templateType,
        git_branch: input.slug,
        supabase_project_ref: input.secrets.supabaseProjectRef,
        status: 'draft',
        registration_source: 'admin',
        created_by: auth.user!.id,
      })
      .select('*')
      .single();

    if (custErr || !inserted) {
      return NextResponse.json(
        { error: custErr?.message || 'Failed to create customer' },
        { status: 500 }
      );
    }
    customer = inserted;
  }

  if (!customer) {
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }

  const enc = encryptJson(input.secrets);
  const { error: secErr } = await db.from('customer_secrets').upsert(
    {
      customer_id: customer.id,
      ciphertext: enc.ciphertext,
      iv: enc.iv,
      auth_tag: enc.authTag,
    },
    { onConflict: 'customer_id' }
  );
  if (secErr) {
    if (!existing) {
      await db.from('customers').delete().eq('id', customer.id);
    }
    return NextResponse.json({ error: secErr.message }, { status: 500 });
  }

  const adminEmail = input.adminEmail || `admin@${input.slug}.com`;
  const { data: existingAdmin } = await db
    .from('customer_admins')
    .select('id')
    .eq('customer_id', customer.id)
    .eq('email', adminEmail)
    .maybeSingle();

  let revealedPassword: string | undefined;
  if (input.adminPassword || !existingAdmin) {
    const adminPassword = input.adminPassword || generatePassword(18);
    const encPass = encryptSecret(adminPassword);
    if (existingAdmin) {
      await db
        .from('customer_admins')
        .update({
          password_ciphertext: encPass.ciphertext,
          password_iv: encPass.iv,
          password_auth_tag: encPass.authTag,
        })
        .eq('id', existingAdmin.id);
    } else {
      await db.from('customer_admins').insert({
        customer_id: customer.id,
        email: adminEmail,
        password_ciphertext: encPass.ciphertext,
        password_iv: encPass.iv,
        password_auth_tag: encPass.authTag,
      });
    }
    revealedPassword = adminPassword;
  }

  const { data: job, error: jobErr } = await db
    .from('provision_jobs')
    .insert({
      customer_id: customer.id,
      status: 'queued',
      current_step: 'queued',
    })
    .select('*')
    .single();

  if (jobErr || !job) {
    return NextResponse.json({ error: jobErr?.message || 'Failed to create job' }, { status: 500 });
  }

  void TEMPLATE_CONFIGS;
  scheduleProvisionRun(job.id);

  return NextResponse.json({
    customerId: customer.id,
    jobId: job.id,
    slug: customer.slug,
    adminEmail,
    adminPassword: revealedPassword,
  });
}
