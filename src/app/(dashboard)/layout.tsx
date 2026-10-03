import { DashboardSidebar } from '@/components/dashboard/sidebar/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/header/DashboardHeader';
import { PushSubscribePrompt } from '@/components/dashboard/PushSubscribePrompt';
import { Providers } from '@/components/providers/Providers';
import { OrderAlertsProvider } from '@/hooks/useOrderAlerts';
import { isEcommerceStore } from '@/lib/store-config';
import { Toaster } from 'sonner';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (isEcommerceStore) {
    return (
      <Providers>
        <div className="flex min-h-screen overflow-x-hidden pb-[env(safe-area-inset-bottom)]">
          <DashboardSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <DashboardHeader />
            <main id="main-content" className="flex-1 p-4 sm:p-6" tabIndex={-1}>
              {children}
            </main>
          </div>
        </div>
        <Toaster position="top-right" richColors closeButton />
      </Providers>
    );
  }

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
