import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Providers } from '@/components/providers/Providers';
import { Toaster } from 'sonner';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <DashboardShell>{children}</DashboardShell>
      <Toaster position="top-right" richColors closeButton />
    </Providers>
  );
}
