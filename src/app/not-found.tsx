'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/components/providers/RootI18nProvider';

export default function NotFound() {
  const t = useTranslations('errors');
  const tCommon = useTranslations('common');
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center p-8">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <h2 className="text-xl font-semibold">{t('pageNotFound')}</h2>
      <p className="text-muted-foreground">{t('pageNotFoundDesc')}</p>
      <Link href="/">
        <Button>{tCommon('goHome')}</Button>
      </Link>
    </div>
  );
}
