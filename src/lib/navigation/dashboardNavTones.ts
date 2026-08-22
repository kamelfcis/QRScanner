export type NavTone = {
  well: string;
  label: string;
};

/** One pigment per destination — spice-counter wells, not pastel chips. */
export const DASHBOARD_NAV_TONES: Record<string, NavTone> = {
  orders: {
    well: 'bg-amber-600 dark:bg-amber-500',
    label: 'text-amber-800 dark:text-amber-300',
  },
  coupons: {
    well: 'bg-rose-600 dark:bg-rose-500',
    label: 'text-rose-800 dark:text-rose-300',
  },
  analytics: {
    well: 'bg-indigo-600 dark:bg-indigo-500',
    label: 'text-indigo-800 dark:text-indigo-300',
  },
  reports: {
    well: 'bg-slate-600 dark:bg-slate-500',
    label: 'text-slate-700 dark:text-slate-300',
  },
  menu: {
    well: 'bg-teal-600 dark:bg-teal-500',
    label: 'text-teal-800 dark:text-teal-300',
  },
  import: {
    well: 'bg-sky-600 dark:bg-sky-500',
    label: 'text-sky-800 dark:text-sky-300',
  },
  testimonials: {
    well: 'bg-violet-600 dark:bg-violet-500',
    label: 'text-violet-800 dark:text-violet-300',
  },
  qrCodes: {
    well: 'bg-brand-secondary',
    label: 'text-brand-secondary dark:text-rose-300',
  },
  tables: {
    well: 'bg-stone-600 dark:bg-stone-500',
    label: 'text-stone-700 dark:text-stone-300',
  },
  settings: {
    well: 'bg-zinc-600 dark:bg-zinc-500',
    label: 'text-zinc-700 dark:text-zinc-300',
  },
  menuCategories: {
    well: 'bg-teal-600 dark:bg-teal-500',
    label: 'text-teal-800 dark:text-teal-300',
  },
  menuProducts: {
    well: 'bg-amber-600 dark:bg-amber-500',
    label: 'text-amber-800 dark:text-amber-300',
  },
  menuGallery: {
    well: 'bg-violet-600 dark:bg-violet-500',
    label: 'text-violet-800 dark:text-violet-300',
  },
  menuOffers: {
    well: 'bg-rose-600 dark:bg-rose-500',
    label: 'text-rose-800 dark:text-rose-300',
  },
};

export const FALLBACK_NAV_TONE: NavTone = {
  well: 'bg-brand-secondary',
  label: 'text-foreground',
};

export function getNavTone(key: string): NavTone {
  return DASHBOARD_NAV_TONES[key] ?? FALLBACK_NAV_TONE;
}
