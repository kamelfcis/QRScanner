'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Menu, Settings, LogOut, QrCode, Table, FileUp, MessageSquareQuote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';

const sidebarItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Menu', href: '/dashboard/menu', icon: Menu },
  { name: 'Import', href: '/dashboard/import', icon: FileUp },
  { name: 'Testimonials', href: '/dashboard/testimonials', icon: MessageSquareQuote },
  { name: 'QR Codes', href: '/dashboard/qr', icon: QrCode },
  { name: 'Tables', href: '/dashboard/tables', icon: Table },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <aside className="hidden w-64 border-r bg-muted/40 md:block">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard" className="text-lg font-bold text-primary">
            Warda Shamya
          </Link>
        </div>

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1" aria-label="Dashboard navigation">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="border-t p-4">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={async () => { try { await signOut(); } catch { /* handled by useAuth */ } }}
            aria-label="Logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </aside>
  );
}
