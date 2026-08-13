'use client';

import Link from 'next/link';
import { CustomerLogo } from '@/components/engaz/CustomerLogo';
import { StatusBadge } from '@/components/engaz/StatusBadge';
import { Button } from '@/components/ui/button';
import { DeleteCustomerButton } from '@/components/engaz/DeleteCustomerDialog';
import { isToggleableCustomerStatus } from '@/lib/engaz/status';
import { TEMPLATE_CONFIGS, type TemplateType } from '@/lib/engaz/types';
import type { CustomerListItem } from '@/components/engaz/CustomersTable';

type CustomersCardsProps = {
  rows: CustomerListItem[];
  statusLoadingId: string | null;
  deleteLoadingId: string | null;
  onSetCustomerStatus: (customerId: string, next: 'live' | 'archived') => void;
  onDeleteCustomer: (customerId: string) => void | Promise<void>;
};

export function CustomersCards({
  rows,
  statusLoadingId,
  deleteLoadingId,
  onSetCustomerStatus,
  onDeleteCustomer,
}: CustomersCardsProps) {
  if (!rows.length) {
    return (
      <div className="bg-card text-muted-foreground rounded-lg border px-4 py-10 text-center text-sm">
        No customers yet.{' '}
        <Link href="/customers/new" className="text-primary underline">
          Create one
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((c) => {
        const canToggleStatus =
          isToggleableCustomerStatus(c.status) ||
          (c.status === 'failed' && Boolean(c.production_url));
        const loading = statusLoadingId === c.id;
        const deleteLoading = deleteLoadingId === c.id;
        const templateLabel =
          TEMPLATE_CONFIGS[c.template_type as TemplateType]?.label || c.template_type;

        return (
          <article
            key={c.id}
            className="bg-card flex flex-col gap-4 rounded-lg border p-5 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <CustomerLogo
                key={c.logo_url ?? c.production_url ?? c.id}
                productionUrl={c.production_url}
                displayName={c.display_name_en}
                logoUrl={c.logo_url}
                size="2xl"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <Link
                  href={`/customers/${c.id}`}
                  className="text-primary block truncate font-medium hover:underline"
                >
                  {c.display_name_en}
                </Link>
                <p className="text-muted-foreground truncate font-mono text-xs">{c.slug}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={c.status} />
                  {c.registration_source === 'self_service' && (
                    <span className="inline-flex items-center rounded-full bg-lime-100 px-2 py-0.5 text-xs font-medium text-lime-800">
                      Application
                    </span>
                  )}
                </div>
              </div>
            </div>

            <dl className="grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Template</dt>
                <dd className="font-medium">{templateLabel}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Branch</dt>
                <dd className="truncate font-mono text-xs">{c.git_branch || '—'}</dd>
              </div>
              <div className="flex items-start justify-between gap-2">
                <dt className="text-muted-foreground shrink-0">Production</dt>
                <dd className="min-w-0 text-right">
                  {c.production_url ? (
                    <a
                      href={c.production_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary block truncate hover:underline"
                    >
                      {c.production_url.replace('https://', '')}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-auto border-t pt-4">
              <div className="flex flex-wrap gap-2">
                {canToggleStatus ? (
                  <>
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
                  </>
                ) : null}
                <DeleteCustomerButton
                  displayName={c.display_name_en}
                  status={c.status}
                  loading={deleteLoading || loading}
                  onConfirm={() => onDeleteCustomer(c.id)}
                />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
