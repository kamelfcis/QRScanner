import Link from 'next/link';
import { createServiceRoleClient, requireSuperAdmin } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/engaz/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  await requireSuperAdmin();
  const db = createServiceRoleClient();

  const { data: customers } = await db
    .from('customers')
    .select('id, slug, status, template_type, production_url, created_at')
    .order('created_at', { ascending: false });

  const { data: jobs } = await db
    .from('provision_jobs')
    .select('id, status, customer_id, created_at, current_step')
    .order('created_at', { ascending: false })
    .limit(8);

  const list = customers || [];
  const live = list.filter((c) => c.status === 'live').length;
  const provisioning = list.filter((c) => c.status === 'provisioning').length;
  const failed = list.filter((c) => c.status === 'failed').length;

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Provision customer branches from Warda, Aklet, or Harameen templates.
          </p>
        </div>
        <Link
          href="/customers/new"
          className="bg-primary text-primary-foreground hover:bg-primary/80 inline-flex h-8 items-center rounded-lg px-2.5 text-sm font-medium"
        >
          New customer
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Live customers
            </CardTitle>
          </CardHeader>
          <CardContent className="font-heading text-3xl font-semibold">{live}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Provisioning
            </CardTitle>
          </CardHeader>
          <CardContent className="font-heading text-3xl font-semibold">{provisioning}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent className="font-heading text-3xl font-semibold">{failed}</CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Recent jobs</h2>
        <div className="bg-card overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Job</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Step</th>
                <th className="px-4 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {(jobs || []).map((job) => (
                <tr key={job.id} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">
                    <Link
                      className="text-primary hover:underline"
                      href={`/customers/${job.customer_id}`}
                    >
                      {job.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-4 py-2 capitalize">
                    {(job.current_step || '—').replaceAll('_', ' ')}
                  </td>
                  <td className="text-muted-foreground px-4 py-2">
                    {new Date(job.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {!jobs?.length && (
                <tr>
                  <td colSpan={4} className="text-muted-foreground px-4 py-8 text-center">
                    No provision jobs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
