'use client';

import { WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { hasOfflinePwa } from '@/i18n/config';

export default function OfflinePage() {
  const t = useTranslations('offline');
  const router = useRouter();

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="bg-brand-primary/10 mb-6 flex h-20 w-20 items-center justify-center rounded-full">
        <WifiOff className="text-brand-primary h-10 w-10" />
      </div>
      <h1 className="text-foreground mb-2 text-3xl font-bold">{t('title')}</h1>
      <p className="text-muted-foreground mb-8 max-w-md">{t('description')}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        {hasOfflinePwa ? (
          <Link href="/menu">
            <Button className="min-w-40">{t('viewMenu')}</Button>
          </Link>
        ) : null}
        <Button variant={hasOfflinePwa ? 'outline' : 'default'} onClick={() => router.refresh()}>
          {t('tryAgain')}
        </Button>
        <Link href="/">
          <Button variant="outline">{t('goHome')}</Button>
        </Link>
      </div>
    </div>
  );
}
