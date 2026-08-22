'use client';

import { DashboardSidebar } from '@/components/dashboard/sidebar/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/header/DashboardHeader';
import { SidebarCollapseProvider } from '@/components/dashboard/sidebar/SidebarCollapseContext';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarCollapseProvider>
      <div className="flex min-h-screen overflow-x-hidden pb-[env(safe-area-inset-bottom)]">
        <DashboardSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardHeader />
          <main id="main-content" className="flex-1 p-4 sm:p-6" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </SidebarCollapseProvider>
  );
}
