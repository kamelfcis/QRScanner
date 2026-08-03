'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Bell, Moon, Sun, LayoutDashboard, Settings, LogOut, QrCode, Table, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Menu', href: '/dashboard/menu', icon: Menu },
  { name: 'Import', href: '/dashboard/import', icon: FileUp },
  { name: 'QR Codes', href: '/dashboard/qr', icon: QrCode },
  { name: 'Tables', href: '/dashboard/tables', icon: Table },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function DashboardHeader() {
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Open navigation menu" />}>
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px]">
            <div className="py-4">
              <h2 className="text-lg font-bold text-primary">Warda Shamya</h2>
              <p className="text-sm text-muted-foreground">Admin Dashboard</p>
            </div>
            <nav className="space-y-1" aria-label="Mobile dashboard navigation">
              {navItems.map((item) => {
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
            <div className="border-t pt-4 mt-4">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => signOut()}
                aria-label="Logout"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden md:block">
        <span className="text-lg font-semibold">Dashboard</span>
      </div>

      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
      </div>
    </header>
  );
}
