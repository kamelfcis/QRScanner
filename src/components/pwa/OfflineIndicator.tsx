'use client';

import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {showBanner && !isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          className={cn(
            'fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2',
            'bg-secondary/90 px-4 py-2 text-sm text-white backdrop-blur-sm'
          )}
          role="alert"
        >
          <WifiOff className="h-4 w-4" />
          <span>You are offline. Some features may be unavailable.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
