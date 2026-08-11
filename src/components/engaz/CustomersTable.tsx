'use client';

import Link from 'next/link';
import { CustomerLogo } from '@/components/engaz/CustomerLogo';
import { StatusBadge } from '@/components/engaz/StatusBadge';
import { Button } from '@/components/ui/button';
import { isToggleableCustomerStatus } from '@/lib/engaz/status';
import { TEMPLATE_CONFIGS, type TemplateType } from '@/lib/engaz/types';

export type CustomerListItem = {
  id: string;
  slug: string;
  display_name_en: string;
  template_type: string;
  git_branch: string | null;
  status: string;
  production_url: string | null;
};

type CustomersTableProps = {
  rows: CustomerListItem[];
  statusLoadingId: string | null;
  onSetCustomerStatus: (customerId: string, next: 'live' | 'archived') => void;
};

export function CustomersTable({
  rows,
  statusLoadingId,
  onSetCustomerStatus,
}: CustomersTableProps) {
  return (
    <div className="bg-card overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left">
          <tr>
            <th className="px-4 py-2 font-medium">Customer</th>
            <th className="px-4 py-2 font-medium">Template</th>
            <th className="px-4 py-2 font-medium">Branch</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Production</th>
            <th className="px-4 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const canToggleStatus =
              isToggleableCustomerStatus(c.status) ||
              (c.status === 'failed' && Boolean(c.production_url));
            const loading = statusLoadingId === c.id;

            return (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <CustomerLogo
                      key={c.production_url ?? c.id}
                      productionUrl={c.production_url}
                      displayName={c.display_name_en}
                      size="xl"
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/customers/${c.id}`}
                        className="text-primary font-medium hover:underline"
                      >
                        {c.display_name_en}
                      </Link>
                      <div className="text-muted-foreground truncate text-xs">{c.slug}</div>
                    </div>
                  </div>
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
                <td className="px-4 py-3">
                  {canToggleStatus ? (
                    <div className="flex flex-wrap gap-1">
                      <Button
                        variant={c.status === 'live' ? 'default' : 'outline'}
                        size="sm"
                        disabled={loading || c.status === 'live'}
                        onClick={() => onSetCustomerStatus(c.id, 'live')}
                      >
                        Set live
                      </Button>
                      <Button
                        variant={c.status === 'archived' ? 'default' : 'outline'}
                        size="sm"
                        disabled={loading || c.status === 'archived'}
                        onClick={() => onSetCustomerStatus(c.id, 'archived')}
                      >
                        Set offline
                      </Button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
              </tr>
            );
          })}
          {!rows.length && (
            <tr>
              <td colSpan={6} className="text-muted-foreground px-4 py-10 text-center">
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
  );
}
