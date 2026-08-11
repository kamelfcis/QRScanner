import Link from 'next/link';
import { createServiceRoleClient, requireSuperAdmin } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/engaz/StatusBadge';
import { TEMPLATE_CONFIGS, type TemplateType } from '@/lib/engaz/types';

export default async function CustomersPage() {
  await requireSuperAdmin();
  const db = createServiceRoleClient();
  const { data: customers } = await db
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Customers</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Branches, templates, status, and production URLs.
          </p>
        </div>
        <Link
          href="/customers/new"
          className="bg-primary text-primary-foreground hover:bg-primary/80 inline-flex h-8 items-center rounded-lg px-2.5 text-sm font-medium"
        >
          New customer
        </Link>
      </div>

      <div className="bg-card overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Customer</th>
              <th className="px-4 py-2 font-medium">Template</th>
              <th className="px-4 py-2 font-medium">Branch</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Production</th>
            </tr>
          </thead>
          <tbody>
            {(customers || []).map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-3">
                  <Link
                    href={`/customers/${c.id}`}
                    className="text-primary font-medium hover:underline"
                  >
                    {c.display_name_en}
                  </Link>
                  <div className="text-muted-foreground text-xs">{c.slug}</div>
                </td>
                <td className="px-4 py-3">
                  {TEMPLATE_CONFIGS[c.template_type as TemplateType]?.label || c.template_type}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{c.git_branch || '—'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3">
                  {c.production_url ? (
                    <a
                      href={c.production_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {c.production_url.replace('https://', '')}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
            {!customers?.length && (
              <tr>
                <td colSpan={5} className="text-muted-foreground px-4 py-10 text-center">
                  No customers yet.{' '}
                  <Link href="/customers/new" className="text-primary underline">
                    Create one
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
