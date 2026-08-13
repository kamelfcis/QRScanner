export const TOGGLEABLE_CUSTOMER_STATUSES = ['live', 'archived'] as const;
export type ToggleableCustomerStatus = (typeof TOGGLEABLE_CUSTOMER_STATUSES)[number];

export const DELETABLE_CUSTOMER_STATUSES = ['draft', 'failed', 'archived'] as const;
export type DeletableCustomerStatus = (typeof DELETABLE_CUSTOMER_STATUSES)[number];

export function isToggleableCustomerStatus(status: string): status is ToggleableCustomerStatus {
  return TOGGLEABLE_CUSTOMER_STATUSES.includes(status as ToggleableCustomerStatus);
}

export function isDeletableCustomerStatus(status: string): status is DeletableCustomerStatus {
  return DELETABLE_CUSTOMER_STATUSES.includes(status as DeletableCustomerStatus);
}

export function isDeleteBlockedStatus(status: string): boolean {
  return status === 'live' || status === 'provisioning';
}

export function statusLabel(status: string): string {
  if (status === 'archived') return 'Offline';
  if (status === 'live') return 'Live';
  return status.replaceAll('_', ' ');
}
