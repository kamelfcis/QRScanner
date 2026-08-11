'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/engaz/StatusBadge';

type PlatformStatus = {
  repo: string;
  missing: string[];
  tokens: Record<string, { configured: boolean; hint: string | null }>;
  githubRepo: { private: boolean; full_name: string } | null;
  githubRepoError: string | null;
  privacyWarning: boolean | null;
};

export default function SettingsPage() {
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/platform/status');
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load');
        return;
      }
      setStatus(json);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Platform token status (masked). Secrets are never shown in full.
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">GitHub repository</CardTitle>
          <CardDescription>
            Customer branches and Engaz Admin live in one private monorepo. GitHub cannot privatize
            a single branch — the whole repo must be private.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            Repo: <span className="font-mono">{status?.repo || '…'}</span>
          </div>
          {status?.githubRepo && (
            <div className="flex items-center gap-2">
              Visibility: <StatusBadge status={status.githubRepo.private ? 'live' : 'failed'} />
              <span>{status.githubRepo.private ? 'private' : 'PUBLIC — fix immediately'}</span>
            </div>
          )}
          {status?.githubRepoError && (
            <p className="text-xs text-amber-700">{status.githubRepoError}</p>
          )}
          {status?.privacyWarning && (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
              Warning: repository is public. CUSTOMER_HANDOFF.md will expose admin passwords. Make
              kamelfcis/QRScanner private before provisioning customers.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform env vars</CardTitle>
          <CardDescription>
            Configured on the Engaz Admin Vercel project / .env.local
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {status &&
              Object.entries(status.tokens).map(([key, val]) => (
                <li key={key} className="flex items-center justify-between py-2">
                  <span className="font-mono text-xs">{key}</span>
                  <span className={val.configured ? 'text-emerald-700' : 'text-red-700'}>
                    {val.configured ? val.hint : 'missing'}
                  </span>
                </li>
              ))}
          </ul>
          {!!status?.missing?.length && (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              Missing for provisioning: {status.missing.join(', ')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
