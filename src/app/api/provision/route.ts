import { NextResponse } from 'next/server';
import { z } from 'zod';
import { encryptJson, encryptSecret, generatePassword } from '@/lib/crypto/secrets';
import { TEMPLATE_CONFIGS } from '@/lib/engaz/types';
import { requireServerSecrets } from '@/lib/env';
import { createServiceRoleClient, requireSuperAdmin } from '@/lib/supabase/server';
import { startProvisionJob } from '@/server/provision/runner';

const bodySchema = z.object({
  templateType: z.enum(['warda', 'aklet', 'harameen']),
  slug: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/),
  displayNameAr: z.string().min(1),
  displayNameEn: z.string().min(1),
  adminEmail: z.string().email().optional(),
  adminPassword: z.string().min(8).optional(),
  secrets: z.object({
    supabaseUrl: z.string().url(),
    supabaseAnonKey: z.string().min(20),
    supabaseServiceRoleKey: z.string().min(20),
    supabaseDbPassword: z.string().min(1),
    supabaseAccessToken: z.string().min(10),
    supabaseProjectRef: z.string().min(5),
  }),
});

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
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const db = createServiceRoleClient();

  const { data: existing } = await db
    .from('customers')
    .select('id')
    .eq('slug', input.slug)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
  }

  const { data: customer, error: custErr } = await db
    .from('customers')
    .insert({
      slug: input.slug,
      display_name_ar: input.displayNameAr,
      display_name_en: input.displayNameEn,
      template_type: input.templateType,
      git_branch: input.slug,
      supabase_project_ref: input.secrets.supabaseProjectRef,
      status: 'draft',
      created_by: auth.user!.id,
    })
    .select('*')
    .single();

  if (custErr || !customer) {
    return NextResponse.json(
      { error: custErr?.message || 'Failed to create customer' },
      { status: 500 }
    );
  }

  const enc = encryptJson(input.secrets);
  const { error: secErr } = await db.from('customer_secrets').insert({
    customer_id: customer.id,
    ciphertext: enc.ciphertext,
    iv: enc.iv,
    auth_tag: enc.authTag,
  });
  if (secErr) {
    await db.from('customers').delete().eq('id', customer.id);
    return NextResponse.json({ error: secErr.message }, { status: 500 });
  }

  const adminEmail = input.adminEmail || `admin@${input.slug}.com`;
  const adminPassword = input.adminPassword || generatePassword(18);
  const encPass = encryptSecret(adminPassword);
  await db.from('customer_admins').insert({
    customer_id: customer.id,
    email: adminEmail,
    password_ciphertext: encPass.ciphertext,
    password_iv: encPass.iv,
    password_auth_tag: encPass.authTag,
  });

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
  startProvisionJob(job.id);

  return NextResponse.json({
    customerId: customer.id,
    jobId: job.id,
    slug: customer.slug,
    adminEmail,
    // Password shown once at create time for handoff UI
    adminPassword,
  });
}
