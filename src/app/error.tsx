'use client';

import { useTranslations } from '@/components/providers/RootI18nProvider';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors');
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <h2 className="mb-2 text-xl font-semibold">{t('somethingWentWrong')}</h2>
      <p className="mb-4 text-muted-foreground">{t('unexpectedError')}</p>
      <button
        onClick={reset}
        className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
      >
        {t('tryAgain')}
      </button>
    </div>
  );
}
