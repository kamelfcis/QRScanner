import { Providers } from '@/components/providers/Providers';
import { PushSubscribePrompt } from '@/components/dashboard/PushSubscribePrompt';
import { ServiceWorkerUpdatePrompt } from '@/components/shared/ServiceWorkerUpdatePrompt';
import { OrderAlertsProvider } from '@/hooks/useOrderAlerts';
import { Toaster } from 'sonner';

export const dynamic = 'force-dynamic';

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <OrderAlertsProvider>
        <PushSubscribePrompt />
        <ServiceWorkerUpdatePrompt />
        {children}
        <Toaster position="top-right" richColors closeButton />
      </OrderAlertsProvider>
    </Providers>
  );
}
