'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const standaloneQuery = () => window.matchMedia('(display-mode: standalone)');

function subscribeToStandalone(onChange: () => void) {
  const query = standaloneQuery();
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [wasInstalled, setWasInstalled] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const t = useTranslations('pwa');

  const isStandalone = useSyncExternalStore(
    subscribeToStandalone,
    () => standaloneQuery().matches,
    () => false
  );
  const isInstalled = wasInstalled || isStandalone;

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 30000);
    };

    const installedHandler = () => {
      setWasInstalled(true);
      setShowPrompt(false);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('harameen-pwa-dismissed', 'true');
  };

  if (isInstalled || !showPrompt || !deferredPrompt) return null;
  if (typeof window !== 'undefined' && sessionStorage.getItem('harameen-pwa-dismissed'))
    return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 50 }}
          className={cn(
            'fixed bottom-4 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:max-w-sm',
            'border-brand-primary/20 bg-background rounded-xl border p-4 shadow-2xl'
          )}
        >
          <div className="flex items-start gap-3">
            <div className="bg-brand-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
              <Download className="text-brand-primary h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-foreground font-semibold">{t('installTitle')}</p>
              <p className="text-muted-foreground mt-1 text-sm">{t('installDescription')}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={handleInstall}>
                  {t('install')}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDismiss}>
                  {t('notNow')}
                </Button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground shrink-0 rounded-md p-1"
              aria-label={t('dismiss')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
