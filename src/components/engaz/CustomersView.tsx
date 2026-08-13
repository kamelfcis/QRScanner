'use client';

import { useMemo, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { CustomersCards } from '@/components/engaz/CustomersCards';
import { CustomersTable, type CustomerListItem } from '@/components/engaz/CustomersTable';
import { Button } from '@/components/ui/button';
import { useCustomersViewMode } from '@/lib/engaz/customers-view';
import { useCustomerRows } from '@/lib/engaz/use-customer-rows';
import { cn } from '@/lib/utils';

type CustomersViewProps = {
  customers: CustomerListItem[];
};

type ListFilter = 'all' | 'applications';

function isNewApplication(c: CustomerListItem) {
  if (c.registration_source === 'self_service' && c.status === 'draft') return true;
  return c.status === 'draft' && !c.git_branch && !c.production_url;
}

export function CustomersView({ customers }: CustomersViewProps) {
  const [view, setView] = useCustomersViewMode();
  const [filter, setFilter] = useState<ListFilter>('all');
  const { rows, setCustomerStatus, statusLoadingId } = useCustomerRows(customers);

  const applicationCount = useMemo(
    () => rows.filter(isNewApplication).length,
    [rows]
  );
  const visibleRows = useMemo(
    () => (filter === 'applications' ? rows.filter(isNewApplication) : rows),
    [filter, rows]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="bg-muted/40 inline-flex rounded-lg border p-0.5"
          role="group"
          aria-label="Customer filter"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(filter === 'all' && 'bg-background shadow-sm')}
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('gap-1.5', filter === 'applications' && 'bg-background shadow-sm')}
            aria-pressed={filter === 'applications'}
            onClick={() => setFilter('applications')}
          >
            New applications
            {applicationCount > 0 && (
              <span className="rounded-full bg-lime-500 px-1.5 text-[10px] font-semibold text-black">
                {applicationCount}
              </span>
            )}
          </Button>
        </div>
        <div
          className="bg-muted/40 inline-flex rounded-lg border p-0.5"
          role="group"
          aria-label="Customers view"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('gap-1.5', view === 'table' && 'bg-background shadow-sm')}
            aria-pressed={view === 'table'}
            onClick={() => setView('table')}
          >
            <List className="size-4" />
            Table
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('gap-1.5', view === 'card' && 'bg-background shadow-sm')}
            aria-pressed={view === 'card'}
            onClick={() => setView('card')}
          >
            <LayoutGrid className="size-4" />
            Cards
          </Button>
        </div>
      </div>

      {view === 'table' ? (
        <CustomersTable
          rows={visibleRows}
          statusLoadingId={statusLoadingId}
          onSetCustomerStatus={setCustomerStatus}
        />
      ) : (
        <CustomersCards
          rows={visibleRows}
          statusLoadingId={statusLoadingId}
          onSetCustomerStatus={setCustomerStatus}
        />
      )}
    </div>
  );
}
