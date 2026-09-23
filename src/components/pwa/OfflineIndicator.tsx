'use client';

import { usePathname } from 'next/navigation';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { hasOfflinePwa } from '@/i18n/config';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const pathname = usePathname();
  const t = useTranslations('offline');

  const message =
    hasOfflinePwa && pathname.startsWith('/menu') ? t('menuOfflineHint') : t('youAreOffline');

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          className={cn(
            'fixed left-0 right-0 top-0 z-[100] flex items-center justify-center gap-2',
            'bg-secondary/90 px-4 py-2 text-sm text-white backdrop-blur-sm'
          )}
          role="alert"
        >
          <WifiOff className="h-4 w-4" />
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
