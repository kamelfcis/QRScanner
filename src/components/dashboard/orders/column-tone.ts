import type { OrderStatus } from '@/types/database';

/** Default header pill + meter styling for order columns (non-cashier tenants). */
export const COLUMN_TONE: Record<OrderStatus, string> = {
  new: 'border-amber-400/70 bg-amber-500/10 text-amber-800 dark:text-amber-200',
  preparing: 'border-sky-400/70 bg-sky-500/10 text-sky-800 dark:text-sky-200',
  ready: 'border-emerald-400/70 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
  completed: 'border-slate-300 bg-slate-500/10 text-slate-700 dark:text-slate-200',
  cancelled: 'border-rose-400/70 bg-rose-500/10 text-rose-800 dark:text-rose-200',
};

/** Higher-contrast cashier meters — hettsamaka orders board only. */
export const COLUMN_TONE_POS: Record<OrderStatus, string> = {
  new: 'border-amber-500/80 bg-amber-500/25 text-amber-950 dark:border-amber-400/70 dark:bg-amber-500/20 dark:text-amber-100',
  preparing:
    'border-sky-600/80 bg-sky-500/25 text-sky-950 dark:border-sky-400/70 dark:bg-sky-500/20 dark:text-sky-100',
  ready:
    'border-emerald-600/80 bg-emerald-500/25 text-emerald-950 dark:border-emerald-400/70 dark:bg-emerald-500/20 dark:text-emerald-100',
  completed:
    'border-slate-500/70 bg-slate-500/20 text-slate-800 dark:border-slate-400/60 dark:bg-slate-500/15 dark:text-slate-100',
  cancelled:
    'border-rose-500/80 bg-rose-500/25 text-rose-950 dark:border-rose-400/70 dark:bg-rose-500/20 dark:text-rose-100',
};

/** Left status stamp on column wrappers (hettsamaka cashier board). */
export const COLUMN_STAMP: Record<OrderStatus, string> = {
  new: 'border-s-4 border-s-amber-500 bg-amber-500/10 dark:bg-amber-500/15',
  preparing: 'border-s-4 border-s-sky-600 bg-sky-500/10 dark:bg-sky-500/15',
  ready: 'border-s-4 border-s-emerald-600 bg-emerald-500/10 dark:bg-emerald-500/15',
  completed: 'border-s-4 border-s-slate-500 bg-slate-500/10 dark:bg-slate-500/12',
  cancelled: 'border-s-4 border-s-rose-500 bg-rose-500/10 dark:bg-rose-500/15',
};

/** Counter palette rails (design tokens). */
export const COLUMN_RAIL: Record<OrderStatus, string> = {
  new: 'bg-[#D97706]',
  preparing: 'bg-[#0369A1]',
  ready: 'bg-[#047857]',
  completed: 'bg-[#475569]',
  cancelled: 'bg-[#E11D48]',
};

export const ACTIVE_COLUMNS = ['new', 'preparing', 'ready', 'completed'] as const;

export type ActiveOrderStatus = (typeof ACTIVE_COLUMNS)[number];

export const NEXT_STATUS_ACTION_TONE: Partial<Record<OrderStatus, string>> = {
  preparing: 'bg-sky-600 text-white hover:bg-sky-700',
  ready: 'bg-emerald-600 text-white hover:bg-emerald-700',
  completed: 'bg-slate-600 text-white hover:bg-slate-700',
};
