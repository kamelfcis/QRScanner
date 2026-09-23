import { Providers } from '@/components/providers/Providers';
import { PushSubscribePrompt } from '@/components/dashboard/PushSubscribePrompt';
import { DashboardOfflineGuard } from '@/components/dashboard/DashboardOfflineGuard';
import { OrderAlertsProvider } from '@/hooks/useOrderAlerts';
import { hasOfflinePwa } from '@/i18n/config';
import { Toaster } from 'sonner';

export const dynamic = 'force-dynamic';

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  const content = (
    <OrderAlertsProvider>
      <PushSubscribePrompt />
      {children}
      <Toaster position="top-right" richColors closeButton />
    </OrderAlertsProvider>
  );

  return (
    <Providers>
      {hasOfflinePwa ? <DashboardOfflineGuard>{content}</DashboardOfflineGuard> : content}
    </Providers>
  );
}
