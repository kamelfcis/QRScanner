'use client';

import { useRestaurantSettings } from '@/hooks/useSettings';
import { ServerDownScreen, useShowServerDown } from '@/components/shared/feedback/ServerDownScreen';
import { isUnavailableReadError } from '@/lib/supabase/isUnavailableReadError';

/** Same full-screen notice when the shared dashboard settings read fails. */
export function DashboardDataGate({ children }: { children: React.ReactNode }) {
  const settings = useRestaurantSettings();
  const showDown = useShowServerDown(isUnavailableReadError(settings.error));

  if (showDown) return <ServerDownScreen />;
  return children;
}
