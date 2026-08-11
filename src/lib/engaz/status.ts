export const TOGGLEABLE_CUSTOMER_STATUSES = ['live', 'archived'] as const;
export type ToggleableCustomerStatus = (typeof TOGGLEABLE_CUSTOMER_STATUSES)[number];

export function isToggleableCustomerStatus(status: string): status is ToggleableCustomerStatus {
  return TOGGLEABLE_CUSTOMER_STATUSES.includes(status as ToggleableCustomerStatus);
}

export function statusLabel(status: string): string {
  if (status === 'archived') return 'Offline';
  if (status === 'live') return 'Live';
  return status.replaceAll('_', ' ');
}
