'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/components/providers/RootI18nProvider';

export default function MenuError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors');
  useEffect(() => {
    console.error('Menu error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center p-8" role="alert">
      <h2 className="text-xl font-semibold text-destructive">{t('menuUnavailable')}</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={reset} variant="outline">
        {t('tryAgain')}
      </Button>
    </div>
  );
}
