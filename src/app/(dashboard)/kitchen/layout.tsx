import { KitchenShell } from '@/components/dashboard/kitchen/KitchenShell';

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return <KitchenShell>{children}</KitchenShell>;
}
