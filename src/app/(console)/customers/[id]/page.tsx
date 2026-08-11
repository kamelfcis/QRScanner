'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { JobTimeline } from '@/components/engaz/JobTimeline';
import { StatusBadge } from '@/components/engaz/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Detail = {
  customer: {
    id: string;
    slug: string;
    display_name_en: string;
    display_name_ar: string;
    template_type: string;
    git_branch: string | null;
    production_url: string | null;
    status: string;
    vercel_project_id: string | null;
  };
  latestJob: { id: string; status: string; error_message: string | null } | null;
  events: Array<{
    id: string;
    step: string;
    level: string;
    message: string;
    created_at: string;
  }>;
  admins: Array<{ email: string }>;
};

function readHandoff(id: string): { email: string; password: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`engaz-handoff-${id}`);
    return raw ? (JSON.parse(raw) as { email: string; password: string }) : null;
  } catch {
    return null;
  }
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(`/api/customers/${params.id}`);
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error || 'Failed to load');
      setLoading(false);
      return;
    }
    setData(json);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    const handoff = readHandoff(params.id);
    if (handoff) {
      queueMicrotask(() => setCreds(handoff));
    }

    let cancelled = false;
    const run = async () => {
      const res = await fetch(`/api/customers/${params.id}`);
      const json = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        toast.error(json.error || 'Failed to load');
        setLoading(false);
        return;
      }
      setData(json);
      setLoading(false);
    };

    const boot = setTimeout(() => {
      void run();
    }, 0);
    const interval = setInterval(() => {
      void run();
    }, 4000);

    return () => {
      cancelled = true;
      clearTimeout(boot);
      clearInterval(interval);
    };
  }, [params.id]);

  async function reveal() {
    const res = await fetch(`/api/customers/${params.id}/reveal-admin`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error || 'Reveal failed');
      return;
    }
    setCreds(json);
  }

  async function retry() {
    const res = await fetch(`/api/customers/${params.id}/retry`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error || 'Retry failed');
      return;
    }
    toast.success('Retry job queued');
    await load();
  }

  if (loading || !data) {
    return <p className="text-muted-foreground text-sm">Loading customer…</p>;
  }

  const c = data.customer;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/customers" className="text-muted-foreground text-xs hover:underline">
            ← Customers
          </Link>
          <h1 className="font-heading mt-2 text-3xl font-semibold tracking-tight">
            {c.display_name_en}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm" dir="rtl">
            {c.display_name_ar}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={c.status} />
            <span className="text-muted-foreground font-mono text-xs">{c.slug}</span>
            <span className="text-muted-foreground text-xs">· {c.template_type}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {c.production_url && (
            <a
              href={c.production_url}
              target="_blank"
              rel="noreferrer"
              className="border-border bg-background hover:bg-muted inline-flex h-8 items-center rounded-lg border px-2.5 text-sm font-medium"
            >
              Open production
            </a>
          )}
          {(c.status === 'failed' || data.latestJob?.status === 'failed') && (
            <Button onClick={retry}>Retry provision</Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Handoff</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Production URL</div>
              <div>{c.production_url || 'Pending deploy'}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Git branch</div>
              <div className="font-mono text-xs">{c.git_branch || '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">CUSTOMER_HANDOFF.md</div>
              <div className="font-mono text-xs">
                branch:{c.git_branch || c.slug}/CUSTOMER_HANDOFF.md
              </div>
            </div>
            <div className="bg-muted/40 rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">Admin credentials</span>
                <Button size="sm" variant="outline" onClick={reveal}>
                  Reveal
                </Button>
              </div>
              {creds ? (
                <dl className="space-y-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">Email: </span>
                    <span className="font-mono">{creds.email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Password: </span>
                    <span className="font-mono">{creds.password}</span>
                  </div>
                </dl>
              ) : (
                <p className="text-muted-foreground text-xs">
                  {data.admins[0]?.email || 'No admin row'} — click Reveal to decrypt password.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {data.latestJob?.error_message && (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {data.latestJob.error_message}
              </div>
            )}
            <JobTimeline events={data.events} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
