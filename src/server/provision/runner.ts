import { decryptJson, encryptJson, encryptSecret, generatePassword } from '@/lib/crypto/secrets';
import type { CustomerSecrets, ProvisionJobStatus, TemplateType } from '@/lib/engaz/types';
import { TEMPLATE_CONFIGS } from '@/lib/engaz/types';
import { env } from '@/lib/env';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  applyCustomerMigrations,
  createCustomerAdminUser,
  seedEmptyMenu,
  validateCustomerSupabase,
} from '@/server/provision/customer-supabase';
import {
  commitFiles,
  createBranch,
  getBranchSha,
  getFileText,
  getRepoPrivacy,
} from '@/server/provision/github';
import {
  assignAlias,
  createDeployment,
  createOrGetProject,
  customerProductionUrl,
  upsertEnvVars,
  waitForDeployment,
} from '@/server/provision/vercel';
import {
  brandingReplacements,
  buildCustomerEnvExample,
  buildHandoffMarkdown,
} from '@/server/templates/settings';

async function logEvent(
  jobId: string,
  step: string,
  message: string,
  level: 'info' | 'warn' | 'error' | 'success' = 'info',
  meta: Record<string, unknown> = {}
) {
  const db = createServiceRoleClient();
  await db.from('provision_job_events').insert({
    job_id: jobId,
    step,
    level,
    message,
    meta,
  });
}

async function setJobStatus(
  jobId: string,
  status: ProvisionJobStatus,
  extra: Record<string, unknown> = {}
) {
  const db = createServiceRoleClient();
  await db
    .from('provision_jobs')
    .update({
      status,
      current_step: status,
      updated_at: new Date().toISOString(),
      ...extra,
    })
    .eq('id', jobId);
}

async function setCustomerStatus(
  customerId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const db = createServiceRoleClient();
  await db
    .from('customers')
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq('id', customerId);
}

export async function runProvisionJob(jobId: string): Promise<void> {
  const db = createServiceRoleClient();
  const { data: job, error: jobErr } = await db
    .from('provision_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  if (jobErr || !job) throw new Error(`Job not found: ${jobId}`);

  const { data: customer, error: custErr } = await db
    .from('customers')
    .select('*')
    .eq('id', job.customer_id)
    .single();
  if (custErr || !customer) throw new Error('Customer not found');

  const { data: secretRow, error: secErr } = await db
    .from('customer_secrets')
    .select('*')
    .eq('customer_id', customer.id)
    .single();
  if (secErr || !secretRow) throw new Error('Customer secrets not found');

  const secrets = decryptJson<CustomerSecrets>({
    ciphertext: secretRow.ciphertext,
    iv: secretRow.iv,
    authTag: secretRow.auth_tag,
  });

  const templateType = customer.template_type as TemplateType;
  const tpl = TEMPLATE_CONFIGS[templateType];
  const slug = customer.slug as string;
  const gitBranch = slug;
  let productionUrl = customerProductionUrl(slug);
  let adminEmail = `admin@${slug}.local`;
  const adminPassword = generatePassword(18);
  let vercelProjectId: string | undefined;

  try {
    await setCustomerStatus(customer.id, 'provisioning');
    await setJobStatus(jobId, 'queued', {
      started_at: new Date().toISOString(),
      error_message: null,
    });
    await logEvent(jobId, 'queued', 'Provision job started');

    // ---- 1. Validate ----
    await logEvent(jobId, 'queued', 'Validating platform tokens and customer Supabase…');
    if (!env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN missing');
    if (!env.VERCEL_TOKEN) throw new Error('VERCEL_TOKEN missing');
    const privacy = await getRepoPrivacy();
    if (!privacy.private) {
      await logEvent(
        jobId,
        'queued',
        'WARNING: QRScanner repo is public. Make it private before handing off credentials.',
        'warn'
      );
    }
    await validateCustomerSupabase(secrets);
    await logEvent(jobId, 'queued', 'Validation OK', 'success');

    // ---- 2. Migrate ----
    await setJobStatus(jobId, 'migrating');
    await logEvent(jobId, 'migrating', 'Applying supabase/migrations 001–014…');
    const applied = await applyCustomerMigrations(secrets, (file) => {
      void logEvent(jobId, 'migrating', `Applied ${file.split(/[/\\]/).pop()}`);
    });
    await logEvent(jobId, 'migrating', `Migrations complete (${applied.length} files)`, 'success');

    // ---- 3. Seed empty ----
    await setJobStatus(jobId, 'seeding');
    await logEvent(jobId, 'seeding', 'Clearing menu and upserting template settings…');
    await seedEmptyMenu(secrets, {
      templateType,
      displayNameAr: customer.display_name_ar,
      displayNameEn: customer.display_name_en,
    });
    await logEvent(jobId, 'seeding', 'Empty menu + settings ready', 'success');

    // ---- 4. Customer admin ----
    await setJobStatus(jobId, 'creating_admin');
    const { data: existingAdmin } = await db
      .from('customer_admins')
      .select('*')
      .eq('customer_id', customer.id)
      .maybeSingle();

    if (existingAdmin) {
      adminEmail = existingAdmin.email;
      // Prefer newly generated password on retry and overwrite
    } else {
      adminEmail = `admin@${slug}.com`;
    }

    await logEvent(jobId, 'creating_admin', `Creating dashboard user ${adminEmail}…`);
    const supabaseUserId = await createCustomerAdminUser(secrets, adminEmail, adminPassword);
    const encPass = encryptSecret(adminPassword);
    await db.from('customer_admins').upsert(
      {
        customer_id: customer.id,
        email: adminEmail,
        password_ciphertext: encPass.ciphertext,
        password_iv: encPass.iv,
        password_auth_tag: encPass.authTag,
        supabase_user_id: supabaseUserId,
      },
      { onConflict: 'customer_id,email' }
    );
    await logEvent(jobId, 'creating_admin', 'Customer admin created', 'success');

    // ---- 5. Git branch ----
    await setJobStatus(jobId, 'configuring_git');
    await setJobStatus(jobId, 'cloning');
    await logEvent(jobId, 'cloning', `Creating branch ${gitBranch} from ${tpl.sourceBranch}…`);
    const sha = await getBranchSha(tpl.sourceBranch);
    await createBranch(gitBranch, sha);
    await logEvent(jobId, 'cloning', `Branch ${gitBranch} ready at ${sha.slice(0, 7)}`, 'success');

    await setJobStatus(jobId, 'configuring_git');
    await logEvent(jobId, 'configuring_git', 'Committing rebrand + CUSTOMER_HANDOFF.md…');

    const filesToPatch = [
      '.env.example',
      'src/components/providers/Providers.tsx',
      'src/components/providers/ThemeProvider.tsx',
      'src/lib/dining-mode.ts',
      'src/lib/env.ts',
      'src/app/layout.tsx',
      'src/lib/seo/metadata.ts',
      'public/sw.js',
      'package.json',
    ];

    const patched: { path: string; content: string }[] = [];
    for (const path of filesToPatch) {
      const original = await getFileText(path, gitBranch);
      if (original == null) continue;
      let content = original;
      for (const rep of brandingReplacements(slug, customer.display_name_en)) {
        content = content.replace(rep.from, rep.to);
      }
      if (path === 'package.json') {
        try {
          const pkg = JSON.parse(content) as { name?: string };
          pkg.name = slug;
          content = JSON.stringify(pkg, null, 2) + '\n';
        } catch {
          // leave as-is
        }
      }
      if (content !== original) {
        patched.push({ path, content });
      }
    }

    patched.push({
      path: '.env.example',
      content: buildCustomerEnvExample({
        slug,
        displayNameEn: customer.display_name_en,
        templateType,
        supabaseUrl: secrets.supabaseUrl,
        productionUrl,
      }),
    });

    patched.push({
      path: 'CUSTOMER_HANDOFF.md',
      content: buildHandoffMarkdown({
        slug,
        displayNameEn: customer.display_name_en,
        displayNameAr: customer.display_name_ar,
        templateType,
        productionUrl: '(pending deploy)',
        adminEmail,
        adminPassword,
        gitBranch,
      }),
    });

    await commitFiles({
      branch: gitBranch,
      message: `chore(${slug}): provision customer branch from ${tpl.sourceBranch}`,
      files: patched,
    });

    await db
      .from('customers')
      .update({ git_branch: gitBranch, updated_at: new Date().toISOString() })
      .eq('id', customer.id);
    await logEvent(jobId, 'configuring_git', 'Git rebrand committed', 'success');

    // ---- 6. Vercel ----
    await setJobStatus(jobId, 'deploying');
    await logEvent(jobId, 'deploying', `Creating Vercel project ${slug}…`);
    const project = await createOrGetProject({
      name: slug,
      gitBranch,
      repo: env.GITHUB_REPO,
    });
    vercelProjectId = project.id;

    const envVars: Record<string, string> = {
      NEXT_PUBLIC_SUPABASE_URL: secrets.supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: secrets.supabaseAnonKey,
      SUPABASE_SERVICE_ROLE_KEY: secrets.supabaseServiceRoleKey,
      NEXT_PUBLIC_APP_NAME: customer.display_name_en,
      NEXT_PUBLIC_APP_URL: productionUrl,
      NEXT_PUBLIC_SITE_URL: productionUrl,
      NEXT_PUBLIC_QR_TARGET_PATH: tpl.qrTargetPath,
    };
    if (tpl.fulfillmentMode === 'delivery_only') {
      envVars.NEXT_PUBLIC_FULFILLMENT_MODE = 'delivery_only';
    }
    await upsertEnvVars(project.id, envVars);
    await logEvent(jobId, 'deploying', 'Env vars set; starting production deploy…');

    const deployment = await createDeployment({
      projectName: slug,
      gitBranch,
      repo: env.GITHUB_REPO,
    });
    const ready = await waitForDeployment(deployment.id);
    try {
      productionUrl = await assignAlias(deployment.id, `${slug}.vercel.app`);
    } catch {
      productionUrl = ready.url.startsWith('http') ? ready.url : `https://${ready.url}`;
    }
    // Prefer canonical slug subdomain
    productionUrl = customerProductionUrl(slug);

    await logEvent(jobId, 'deploying', `Deployed: ${productionUrl}`, 'success');

    // ---- 7. Finalize ----
    await commitFiles({
      branch: gitBranch,
      message: `chore(${slug}): finalize CUSTOMER_HANDOFF with production URL`,
      files: [
        {
          path: 'CUSTOMER_HANDOFF.md',
          content: buildHandoffMarkdown({
            slug,
            displayNameEn: customer.display_name_en,
            displayNameAr: customer.display_name_ar,
            templateType,
            productionUrl,
            adminEmail,
            adminPassword,
            gitBranch,
          }),
        },
        {
          path: '.env.example',
          content: buildCustomerEnvExample({
            slug,
            displayNameEn: customer.display_name_en,
            templateType,
            supabaseUrl: secrets.supabaseUrl,
            productionUrl,
          }),
        },
      ],
    });

    // Re-encrypt secrets row touch (no plaintext change needed)
    void encryptJson;

    await setCustomerStatus(customer.id, 'live', {
      production_url: productionUrl,
      vercel_project_id: vercelProjectId,
      git_branch: gitBranch,
      supabase_project_ref: secrets.supabaseProjectRef,
    });
    await setJobStatus(jobId, 'done', {
      finished_at: new Date().toISOString(),
      error_message: null,
    });
    await logEvent(jobId, 'done', `Customer live at ${productionUrl}`, 'success');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await setJobStatus(jobId, 'failed', {
      finished_at: new Date().toISOString(),
      error_message: message,
    });
    await setCustomerStatus(customer.id, 'failed', {
      ...(vercelProjectId ? { vercel_project_id: vercelProjectId } : {}),
      git_branch: gitBranch,
    });
    await logEvent(jobId, 'failed', message, 'error');
    throw err;
  }
}

/** Fire-and-forget wrapper for API routes */
export function startProvisionJob(jobId: string) {
  void runProvisionJob(jobId).catch((err) => {
    console.error('[provision]', jobId, err);
  });
}
