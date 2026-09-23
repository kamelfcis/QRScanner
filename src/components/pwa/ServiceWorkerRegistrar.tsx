'use client';

import { useEffect } from 'react';

export async function ensureServiceWorkerRegistered(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  return registration;
}

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    void ensureServiceWorkerRegistered().catch(() => {
      // SW registration is best-effort; push/offline features degrade gracefully.
    });
  }, []);

  return null;
}
