import { env } from '@/lib/env';

const API = 'https://api.github.com';

type GhFile = { path: string; content: string };

function headers() {
  const token = env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is not configured');
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'engaz-admin',
  };
}

function repoPath() {
  const [owner, repo] = env.GITHUB_REPO.split('/');
  if (!owner || !repo) throw new Error(`Invalid GITHUB_REPO: ${env.GITHUB_REPO}`);
  return { owner, repo };
}

async function gh<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub ${init?.method || 'GET'} ${path} → ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function getRepoPrivacy(): Promise<{ private: boolean; full_name: string }> {
  const { owner, repo } = repoPath();
  const data = await gh<{ private: boolean; full_name: string }>(`/repos/${owner}/${repo}`);
  return { private: data.private, full_name: data.full_name };
}

export async function getBranchSha(branch: string): Promise<string> {
  const { owner, repo } = repoPath();
  const data = await gh<{ object: { sha: string } }>(
    `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`
  );
  return data.object.sha;
}

export async function createBranch(branch: string, fromSha: string): Promise<void> {
  const { owner, repo } = repoPath();
  try {
    await gh(`/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: fromSha }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('422') && message.toLowerCase().includes('already exists')) {
      return;
    }
    throw err;
  }
}

async function getFileSha(path: string, branch: string): Promise<string | undefined> {
  const { owner, repo } = repoPath();
  const res = await fetch(
    `${API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(branch)}`,
    { headers: headers() }
  );
  if (res.status === 404) return undefined;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub get file ${path} → ${res.status}: ${body}`);
  }
  const data = (await res.json()) as { sha: string };
  return data.sha;
}

export async function upsertFile(input: {
  branch: string;
  path: string;
  content: string;
  message: string;
}): Promise<void> {
  const { owner, repo } = repoPath();
  const sha = await getFileSha(input.path, input.branch);
  await gh(
    `/repos/${owner}/${repo}/contents/${input.path.split('/').map(encodeURIComponent).join('/')}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        message: input.message,
        content: Buffer.from(input.content, 'utf8').toString('base64'),
        branch: input.branch,
        ...(sha ? { sha } : {}),
      }),
    }
  );
}

export async function getFileText(path: string, branch: string): Promise<string | null> {
  const { owner, repo } = repoPath();
  const res = await fetch(
    `${API}/repos/${owner}/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`,
    { headers: headers() }
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub read ${path} → ${res.status}: ${body}`);
  }
  const data = (await res.json()) as { content?: string; encoding?: string };
  if (!data.content) return null;
  return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
}

export async function commitFiles(input: {
  branch: string;
  message: string;
  files: GhFile[];
}): Promise<void> {
  for (const file of input.files) {
    await upsertFile({
      branch: input.branch,
      path: file.path,
      content: file.content,
      message: input.message,
    });
  }
}

export const PROTECTED_GIT_BRANCHES = new Set([
  'warda',
  'aklet-gambary',
  'harameen',
  'engaz-admin',
  'engaz-landing-page',
  'main',
]);

export async function deleteBranch(branch: string): Promise<void> {
  if (PROTECTED_GIT_BRANCHES.has(branch)) {
    return;
  }
  const { owner, repo } = repoPath();
  await gh(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: 'DELETE',
  });
}

export { type GhFile };
