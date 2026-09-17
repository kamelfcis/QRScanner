import { Providers } from '@/components/providers/Providers';
import { OrderAlertsProvider } from '@/hooks/useOrderAlerts';
import { Toaster } from 'sonner';

export const dynamic = 'force-dynamic';

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <OrderAlertsProvider>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </OrderAlertsProvider>
    </Providers>
  );
}
