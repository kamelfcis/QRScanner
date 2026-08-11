'use client';

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

export function CustomersView({ customers }: CustomersViewProps) {
  const [view, setView] = useCustomersViewMode();
  const { rows, setCustomerStatus, statusLoadingId } = useCustomerRows(customers);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
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
          rows={rows}
          statusLoadingId={statusLoadingId}
          onSetCustomerStatus={setCustomerStatus}
        />
      ) : (
        <CustomersCards
          rows={rows}
          statusLoadingId={statusLoadingId}
          onSetCustomerStatus={setCustomerStatus}
        />
      )}
    </div>
  );
}
