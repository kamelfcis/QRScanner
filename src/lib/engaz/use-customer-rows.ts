import { useState } from 'react';
import { toast } from 'sonner';
import type { CustomerListItem } from '@/components/engaz/CustomersTable';

export function useCustomerRows(customers: CustomerListItem[]) {
  const [rows, setRows] = useState(customers);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);

  async function setCustomerStatus(customerId: string, next: 'live' | 'archived') {
    setStatusLoadingId(customerId);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const raw = await res.text();
      let json: {
        error?: string;
        customer?: CustomerListItem;
        vercel?: { action?: string };
      } = {};
      if (raw.trim()) {
        try {
          json = JSON.parse(raw);
        } catch {
          toast.error(raw.slice(0, 200) || 'Server returned non-JSON');
          return;
        }
      } else if (!res.ok) {
        toast.error('Failed to update status');
        return;
      }
      if (!res.ok) {
        toast.error(json.error || 'Failed to update status');
        return;
      }
      if (json.customer) {
        setRows((prev) =>
          prev.map((row) => (row.id === customerId ? { ...row, ...json.customer! } : row))
        );
      }
      const action = json.vercel?.action;
      if (action === 'paused') {
        toast.success('Customer is offline — Vercel project paused');
      } else if (action === 'unpaused') {
        toast.success('Customer is live — Vercel project resumed');
      } else {
        toast.success('Status unchanged');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setStatusLoadingId(null);
    }
  }

  return { rows, setCustomerStatus, statusLoadingId };
}
