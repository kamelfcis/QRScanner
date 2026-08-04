'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useTranslations } from '@/components/providers/RootI18nProvider';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const t = useTranslations('accessibility');
  return (
    <div role="status" aria-live="polite">
      <Loader2
        className={cn('animate-spin text-primary', sizeClasses[size], className)}
        aria-label={t('loading')}
      />
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <LoadingSpinner size="lg" />
    </div>
  );
}
