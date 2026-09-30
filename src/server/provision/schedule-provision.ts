import { env } from '@/lib/env';

/** Start (or continue) a provision job in a dedicated long-running route handler. */
export function scheduleProvisionRun(jobId: string): void {
  const secret = env.ENGAZ_SECRETS_KEY;
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  if (!secret) {
    console.error('[provision] ENGAZ_SECRETS_KEY missing — cannot schedule job', jobId);
    return;
  }

  const url = `${base}/api/jobs/${jobId}/run`;
  fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jobId }),
  }).catch((err) => {
    console.error('[provision] schedule run failed', jobId, err);
  });
}
