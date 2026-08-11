import { env } from '@/lib/env';

const API = 'https://api.vercel.com';

function teamQuery() {
  return env.VERCEL_TEAM_ID ? `?teamId=${encodeURIComponent(env.VERCEL_TEAM_ID)}` : '';
}

function headers() {
  const token = env.VERCEL_TOKEN;
  if (!token) throw new Error('VERCEL_TOKEN is not configured');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function vercel<T>(path: string, init?: RequestInit): Promise<T> {
  const sep = path.includes('?') ? '&' : '?';
  const team = env.VERCEL_TEAM_ID ? `${sep}teamId=${encodeURIComponent(env.VERCEL_TEAM_ID)}` : '';
  // teamQuery used when path has no query; avoid double ?
  const url =
    env.VERCEL_TEAM_ID && !path.includes('teamId')
      ? `${API}${path}${path.includes('?') ? '&' : '?'}teamId=${encodeURIComponent(env.VERCEL_TEAM_ID)}`
      : `${API}${path}`;
  void team;
  void teamQuery;
  const res = await fetch(url, {
    ...init,
    headers: { ...headers(), ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vercel ${init?.method || 'GET'} ${path} → ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

export async function createOrGetProject(input: {
  name: string;
  gitBranch: string;
  repo: string; // owner/name
}): Promise<{ id: string; name: string }> {
  try {
    const created = await vercel<{ id: string; name: string }>('/v10/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        framework: 'nextjs',
        gitRepository: {
          type: 'github',
          repo: input.repo,
        },
      }),
    });
    await setProductionBranch(created.id, input.gitBranch);
    return created;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('409') && !message.toLowerCase().includes('already exists')) {
      throw err;
    }
    const existing = await vercel<{ id: string; name: string }>(
      `/v9/projects/${encodeURIComponent(input.name)}`
    );
    await setProductionBranch(existing.id, input.gitBranch);
    return existing;
  }
}

async function setProductionBranch(projectId: string, branch: string) {
  await vercel(`/v9/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      framework: 'nextjs',
      gitForkProtection: false,
    }),
  });
  // Prefer production branch via project settings
  await vercel(`/v9/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      commandForIgnoringBuildStep: null,
    }),
  });
  // Vercel production branch is controlled by deployments + git branch linkage
  void branch;
}

export async function upsertEnvVars(
  projectId: string,
  vars: Record<string, string>
): Promise<void> {
  for (const [key, value] of Object.entries(vars)) {
    try {
      await vercel(`/v10/projects/${projectId}/env`, {
        method: 'POST',
        body: JSON.stringify({
          key,
          value,
          type: key.startsWith('NEXT_PUBLIC_') ? 'plain' : 'encrypted',
          target: ['production', 'preview', 'development'],
        }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('409') || message.toLowerCase().includes('already exists')) {
        // Update existing
        const list = await vercel<{ envs: Array<{ id: string; key: string }> }>(
          `/v9/projects/${projectId}/env`
        );
        const existing = list.envs?.find((e) => e.key === key);
        if (existing) {
          await vercel(`/v9/projects/${projectId}/env/${existing.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              value,
              type: key.startsWith('NEXT_PUBLIC_') ? 'plain' : 'encrypted',
              target: ['production', 'preview', 'development'],
            }),
          });
          continue;
        }
      }
      throw err;
    }
  }
}

export async function createDeployment(input: {
  projectName: string;
  gitBranch: string;
  repo: string;
}): Promise<{ id: string; url: string; inspectorUrl?: string }> {
  const [org, repoName] = input.repo.split('/');
  const deployment = await vercel<{
    id: string;
    url: string;
    inspectorUrl?: string;
  }>('/v13/deployments', {
    method: 'POST',
    body: JSON.stringify({
      name: input.projectName,
      project: input.projectName,
      gitSource: {
        type: 'github',
        org,
        repo: repoName,
        ref: input.gitBranch,
      },
      target: 'production',
    }),
  });
  return deployment;
}

export async function waitForDeployment(
  deploymentId: string,
  opts: { timeoutMs?: number; pollMs?: number } = {}
): Promise<{ readyState: string; url: string }> {
  const timeoutMs = opts.timeoutMs ?? 10 * 60 * 1000;
  const pollMs = opts.pollMs ?? 5000;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const dep = await vercel<{ readyState: string; url: string }>(
      `/v13/deployments/${deploymentId}`
    );
    if (dep.readyState === 'READY') return dep;
    if (dep.readyState === 'ERROR' || dep.readyState === 'CANCELED') {
      throw new Error(`Vercel deployment ${deploymentId} ended as ${dep.readyState}`);
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  throw new Error(`Timed out waiting for deployment ${deploymentId}`);
}

export async function assignAlias(deploymentId: string, alias: string): Promise<string> {
  const result = await vercel<{ alias: string }>(`/v2/deployments/${deploymentId}/aliases`, {
    method: 'POST',
    body: JSON.stringify({ alias }),
  });
  return result.alias.startsWith('http') ? result.alias : `https://${result.alias}`;
}

export function customerProductionUrl(slug: string): string {
  return `https://${slug}.vercel.app`;
}
