'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { isAlaKeefakTenant } from '@/i18n/config';

const UPDATE_TOAST_ID = 'sw-update-prompt';
let listenersAttached = false;

function promptForUpdate(registration: ServiceWorkerRegistration) {
  const waiting = registration.waiting;
  if (!waiting) return;

  toast('تحديث جديد — اضغط للتحديث', {
    id: UPDATE_TOAST_ID,
    duration: Infinity,
    action: {
      label: 'تحديث',
      onClick: () => {
        waiting.postMessage({ type: 'SKIP_WAITING' });
      },
    },
  });
}

export function ServiceWorkerUpdatePrompt() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!isAlaKeefakTenant) return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (listenersAttached) return;
    listenersAttached = true;

    let cancelled = false;

    const onControllerChange = () => {
      toast.dismiss(UPDATE_TOAST_ID);
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        if (cancelled) return;

        registrationRef.current = registration;

        if (registration.waiting) {
          promptForUpdate(registration);
        }

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              promptForUpdate(registration);
            }
          });
        });
      } catch {
        // SW registration is optional; push flow may register separately.
      }
    };

    void register();

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  return null;
}
