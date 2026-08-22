import type { OrderStatus } from '@/types/database';

export const COLUMN_TONE: Record<OrderStatus, string> = {
  new: 'border-amber-400/70 bg-amber-500/10 text-amber-800 dark:text-amber-200',
  preparing: 'border-sky-400/70 bg-sky-500/10 text-sky-800 dark:text-sky-200',
  ready: 'border-emerald-400/70 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
  completed: 'border-slate-300 bg-slate-500/10 text-slate-700 dark:text-slate-200',
  cancelled: 'border-rose-400/70 bg-rose-500/10 text-rose-800 dark:text-rose-200',
};

export const ACTIVE_COLUMNS = ['new', 'preparing', 'ready', 'completed'] as const;

export type ActiveOrderStatus = (typeof ACTIVE_COLUMNS)[number];
