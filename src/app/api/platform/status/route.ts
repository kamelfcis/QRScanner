import { NextResponse } from 'next/server';
import { env, requireServerSecrets } from '@/lib/env';
import { requireSuperAdmin } from '@/lib/supabase/server';
import { getRepoPrivacy } from '@/server/provision/github';

function mask(value?: string) {
  if (!value) return { configured: false, hint: null };
  if (value.length <= 8) return { configured: true, hint: '****' };
  return { configured: true, hint: value.slice(0, 4) + '…' + value.slice(-4) };
}

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.error === 'unauthorized' ? 401 : 403 }
    );
  }

  const secrets = requireServerSecrets();
  let repo: { private: boolean; full_name: string } | null = null;
  let repoError: string | null = null;
  if (env.GITHUB_TOKEN) {
    try {
      repo = await getRepoPrivacy();
    } catch (err) {
      repoError = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json({
    appName: env.NEXT_PUBLIC_APP_NAME,
    repo: env.GITHUB_REPO,
    missing: secrets.missing,
    tokens: {
      SUPABASE_SERVICE_ROLE_KEY: mask(env.SUPABASE_SERVICE_ROLE_KEY),
      ENGAZ_SECRETS_KEY: mask(env.ENGAZ_SECRETS_KEY),
      GITHUB_TOKEN: mask(env.GITHUB_TOKEN),
      VERCEL_TOKEN: mask(env.VERCEL_TOKEN),
      VERCEL_TEAM_ID: mask(env.VERCEL_TEAM_ID),
    },
    githubRepo: repo,
    githubRepoError: repoError,
    privacyWarning: repo ? !repo.private : null,
  });
}
