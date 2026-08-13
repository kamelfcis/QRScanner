import { isDeletableCustomerStatus } from '@/lib/engaz/status';
import type { CustomerStatus } from '@/lib/engaz/types';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { deleteBranch } from '@/server/provision/github';
import { deleteProject } from '@/server/provision/vercel';

export class DeleteCustomerError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'DeleteCustomerError';
    this.status = status;
  }
}

export function getDeleteBlockReason(status: CustomerStatus): string | null {
  if (status === 'live') {
    return 'Set the customer offline before deleting.';
  }
  if (status === 'provisioning') {
    return 'Wait for provisioning to finish or fail before deleting.';
  }
  if (!isDeletableCustomerStatus(status)) {
    return `Cannot delete customer with status "${status}".`;
  }
  return null;
}

export type DeleteCustomerResult = {
  deleted: true;
  warnings: string[];
};

type CustomerDeleteRow = {
  id: string;
  status: CustomerStatus;
  logo_path?: string | null;
  menu_path?: string | null;
  vercel_project_id?: string | null;
  git_branch?: string | null;
};

function warn(warnings: string[], message: string) {
  console.warn(`[delete-customer] ${message}`);
  warnings.push(message);
}

export async function deleteCustomerRecord(
  customer: CustomerDeleteRow
): Promise<DeleteCustomerResult> {
  const blockReason = getDeleteBlockReason(customer.status);
  if (blockReason) {
    throw new DeleteCustomerError(blockReason, 409);
  }

  const warnings: string[] = [];
  const service = createServiceRoleClient();

  if (customer.logo_path) {
    try {
      const { error } = await service.storage
        .from('registration-logos')
        .remove([customer.logo_path]);
      if (error) {
        warn(warnings, `Failed to remove logo: ${error.message}`);
      }
    } catch (err) {
      warn(
        warnings,
        `Failed to remove logo: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  if (customer.menu_path) {
    try {
      const { error } = await service.storage
        .from('registration-menus')
        .remove([customer.menu_path]);
      if (error) {
        warn(warnings, `Failed to remove menu: ${error.message}`);
      }
    } catch (err) {
      warn(
        warnings,
        `Failed to remove menu: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  if (customer.vercel_project_id) {
    try {
      await deleteProject(customer.vercel_project_id);
    } catch (err) {
      warn(
        warnings,
        `Failed to delete Vercel project: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  if (customer.git_branch) {
    try {
      await deleteBranch(customer.git_branch);
    } catch (err) {
      warn(
        warnings,
        `Failed to delete git branch: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  const { error } = await service.from('customers').delete().eq('id', customer.id);
  if (error) {
    throw new DeleteCustomerError('Failed to delete customer record.', 500);
  }

  return { deleted: true, warnings };
}
