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

  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorState title={t('error')} retry={() => refetch()} />;
  if (!linkPage?.enabled) return null;

  return <LinkPageView settings={linkPage} restaurant={restaurant} />;
}
