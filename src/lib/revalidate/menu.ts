import { isAlaKeefakTenant } from '@/i18n/config';

/** Bust Next.js ISR/unstable_cache for public menu pages after dashboard edits. */
export async function revalidateMenuCache(): Promise<void> {
  if (!isAlaKeefakTenant) return;

  try {
    await fetch('/api/revalidate/menu', { method: 'POST' });
  } catch {
    // Non-blocking: client query invalidation still refreshes dashboard UI.
  }
}
