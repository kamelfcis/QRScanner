import { Providers } from '@/components/providers/Providers';
import { PushSubscribePrompt } from '@/components/dashboard/PushSubscribePrompt';
import { OrderAlertsProvider } from '@/hooks/useOrderAlerts';
import { Toaster } from 'sonner';

export const dynamic = 'force-dynamic';

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <OrderAlertsProvider>
        <PushSubscribePrompt />
        {children}
        <Toaster position="top-right" richColors closeButton />
      </OrderAlertsProvider>
    </Providers>
  );
}
