'use client';

import { useState, useEffect } from 'react';
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

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const t = useTranslations('pwa');

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 30000);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setShowPrompt(false);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

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
    sessionStorage.setItem('warda-pwa-dismissed', 'true');
  };

  if (isInstalled || !showPrompt || !deferredPrompt) return null;
  if (typeof window !== 'undefined' && sessionStorage.getItem('warda-pwa-dismissed')) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 50 }}
          className={cn(
            'fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-6 md:bottom-6 md:max-w-sm',
            'rounded-xl border border-brand-primary/20 bg-background p-4 shadow-2xl'
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10">
              <Download className="h-5 w-5 text-brand-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{t('installTitle')}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('installDescription')}
              </p>
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
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
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
