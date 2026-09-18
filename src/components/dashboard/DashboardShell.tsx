'use client';

import { AutoKitchenPrint } from '@/components/dashboard/orders/AutoKitchenPrint';
import { CashierBottomNav, useShowCashierBottomNav } from '@/components/dashboard/CashierBottomNav';
import { DashboardSidebar } from '@/components/dashboard/sidebar/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/header/DashboardHeader';
import { SidebarCollapseProvider } from '@/components/dashboard/sidebar/SidebarCollapseContext';
import { StaffRoleGate } from '@/components/dashboard/StaffRoleGate';
import { cn } from '@/lib/utils';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const showCashierNav = useShowCashierBottomNav();

  return (
    <SidebarCollapseProvider>
      <StaffRoleGate>
        <AutoKitchenPrint />
        <div className="flex min-h-screen overflow-x-hidden pb-[env(safe-area-inset-bottom)]">
          <DashboardSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <DashboardHeader />
            <main
              id="main-content"
              className={cn(
                'flex-1 p-4 sm:p-6',
                showCashierNav && 'max-md:pb-[calc(3.5rem+env(safe-area-inset-bottom))]'
              )}
              tabIndex={-1}
            >
              {children}
            </main>
          </div>
        </div>
        <CashierBottomNav />
      </StaffRoleGate>
    </SidebarCollapseProvider>
  );
}
