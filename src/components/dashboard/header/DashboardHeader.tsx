'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  Bell,
  Moon,
  Sun,
  LayoutDashboard,
  Settings,
  LogOut,
  QrCode,
  Table,
  FileUp,
  BarChart3,
  FileText,
  MessageSquareQuote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/providers/ThemeProvider';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadNotifications, useNotifications, useMarkAllNotificationsRead } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText },
  { name: 'Menu', href: '/dashboard/menu', icon: Menu },
  { name: 'Import', href: '/dashboard/import', icon: FileUp },
  { name: 'Testimonials', href: '/dashboard/testimonials', icon: MessageSquareQuote },
  { name: 'QR Codes', href: '/dashboard/qr', icon: QrCode },
  { name: 'Tables', href: '/dashboard/tables', icon: Table },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function DashboardHeader() {
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);

  const { data: unreadCount } = useUnreadNotifications();
  const { data: notifications } = useNotifications(5);
  const markAllRead = useMarkAllNotificationsRead();

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

      <div className="flex items-center space-x-2">
        <LanguageSwitcher />
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount != null && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-secondary text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border bg-background shadow-lg">
                <div className="flex items-center justify-between border-b px-4 py-2">
                  <span className="text-sm font-medium">Notifications</span>
                  {unreadCount != null && unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => markAllRead.mutate()}
                    >
                      Mark all read
                    </Button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {!notifications?.length ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No notifications
                    </p>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={cn(
                          'border-b px-4 py-3 last:border-0',
                          !notif.is_read && 'bg-brand-primary/5'
                        )}
                      >
                        <p className="text-sm font-medium">{notif.title}</p>
                        {notif.message && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {notif.message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(notif.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>
    </header>
  );
}
