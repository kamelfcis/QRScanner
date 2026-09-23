'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { hasHettSamakaTier3 } from '@/i18n/config';
import { ensureServiceWorkerRegistered } from '@/components/pwa/ServiceWorkerRegistrar';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'hettsamaka:push-prompt-dismissed';

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

async function persistPushSubscription(vapidPublicKey: string) {
  const registration = await ensureServiceWorkerRegistered();
  if (!registration) throw new Error('Service worker unavailable');

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Invalid subscription');
  }

  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    }),
  });

  if (!response.ok) throw new Error('Subscribe failed');
}

export function PushSubscribePrompt() {
  const t = useTranslations('push');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || '';

  useEffect(() => {
    if (!hasHettSamakaTier3 || !vapidPublicKey) return;
    if (typeof window === 'undefined') return;
    if (
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;

    const run = async () => {
      try {
        if (Notification.permission === 'granted') {
          await persistPushSubscription(vapidPublicKey);
          return;
        }
        if (Notification.permission === 'denied') return;
        if (window.localStorage.getItem(DISMISS_KEY) === '1') return;
        timeoutId = window.setTimeout(() => {
          if (!cancelled) setVisible(true);
        }, 1200);
      } catch {
        // Fail closed — in-tab alerts still work.
      }
    };

    void run();
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [vapidPublicKey]);

  const dismiss = useCallback(() => {
    window.localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  }, []);

  const subscribe = useCallback(async () => {
    if (!vapidPublicKey) {
      setVisible(false);
      return;
    }
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        dismiss();
        return;
      }
      await persistPushSubscription(vapidPublicKey);
      window.localStorage.setItem(DISMISS_KEY, '1');
      setVisible(false);
    } catch {
      dismiss();
    } finally {
      setBusy(false);
    }
  }, [dismiss, vapidPublicKey]);

  if (!hasHettSamakaTier3 || !visible) return null;

  return (
    <div
      className={cn(
        'bg-background fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-xl border p-4 shadow-lg',
        'sm:inset-x-auto sm:bottom-6 sm:end-6'
      )}
      role="dialog"
      aria-labelledby="push-prompt-title"
    >
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          <Bell className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p id="push-prompt-title" className="font-medium">
            {t('promptTitle')}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">{t('promptBody')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button className="min-h-11" disabled={busy} onClick={() => void subscribe()}>
              {busy ? t('subscribing') : t('enable')}
            </Button>
            <Button variant="ghost" className="min-h-11" onClick={dismiss}>
              {t('notNow')}
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11 shrink-0"
          onClick={dismiss}
          aria-label={t('dismiss')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
