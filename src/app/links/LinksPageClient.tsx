'use client';

import { LinkPageView } from '@/components/link-page/LinkPageView';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { useLinkPageSettings, useRestaurantSettings } from '@/hooks/useSettings';
import { useTranslations } from '@/components/providers/RootI18nProvider';

export function LinksPageClient() {
  const { data: linkPage, isLoading, error, refetch } = useLinkPageSettings();
  const { data: restaurant } = useRestaurantSettings();
  const t = useTranslations('common');
  const tLinkPage = useTranslations('linkPage');

  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorState title={t('error')} retry={() => refetch()} />;

  if (!linkPage?.enabled) {
    return (
      <main
        id="main-content"
        className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 py-16 text-center"
      >
        <p className="text-lg font-semibold">{tLinkPage('disabledTitle')}</p>
        <p className="text-muted-foreground max-w-md text-sm">{tLinkPage('disabledMessage')}</p>
      </main>
    );
  }

  return <LinkPageView settings={linkPage} restaurant={restaurant} />;
}
