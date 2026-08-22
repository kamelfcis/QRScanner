'use client';

import { useState } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, Bell, Moon, Sun, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/providers/ThemeProvider';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useFeatureSettings, useRestaurantSettings } from '@/hooks/useSettings';
import {
  useUnreadNotifications,
  useNotifications,
  useMarkAllNotificationsRead,
} from '@/hooks/useNotifications';
import { getSiteNameAr, getSiteNameEn } from '@/lib/appName';
import { cn, getName } from '@/lib/utils';
import { formatLocaleDate } from '@/lib/dateLocale';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getDashboardNav } from '@/lib/navigation/dashboardNav';

export function DashboardHeader() {
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const { data: settings } = useRestaurantSettings();
  const { data: features } = useFeatureSettings();
  const navItems = getDashboardNav(features);
  const { locale } = useI18n();
  const tNav = useTranslations('nav');
  const tSidebar = useTranslations('sidebar');
  const tDashboard = useTranslations('dashboard');

  const name = getName(locale, getSiteNameEn(settings), getSiteNameAr(settings));

  const { data: unreadCount } = useUnreadNotifications();
  const { data: notifications } = useNotifications(5);
  const markAllRead = useMarkAllNotificationsRead();

  return (
    <header className="bg-background sticky top-0 z-40 flex h-16 items-center justify-between border-b px-4 pt-[env(safe-area-inset-top)] sm:px-6">
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" aria-label={tNav('menu')} className="h-11 w-11" />
            }
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px]">
            <div className="flex items-center gap-2.5 py-4">
              {settings?.logo_url ? (
                <NextImage
                  src={settings.logo_url}
                  alt={name}
                  width={36}
                  height={36}
                  className="h-9 w-9 shrink-0 object-contain"
                />
              ) : null}
              <div className="min-w-0">
                <h2 className="text-primary font-heading truncate text-lg font-bold">{name}</h2>
                <p className="text-muted-foreground text-sm">{tDashboard('adminDashboard')}</p>
              </div>
            </div>
            <nav className="space-y-1" aria-label={tDashboard('adminDashboard')}>
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                const label = tSidebar(item.key);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center space-x-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="mt-4 border-t pt-4">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => signOut()}
                aria-label={tSidebar('logout')}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {tSidebar('logout')}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden md:block">
        <span className="text-lg font-semibold">{tNav('dashboard')}</span>
      </div>

      <div className="flex items-center space-x-1 sm:space-x-2">
        <LanguageSwitcher />
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            aria-label={tDashboard('notifications')}
            aria-expanded={showNotifications}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount != null && unreadCount > 0 && (
              <span className="bg-brand-secondary absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
                onKeyDown={(e) => e.key === 'Escape' && setShowNotifications(false)}
              />
              <div
                role="dialog"
                aria-label={tDashboard('notifications')}
                className="bg-background absolute end-0 top-full z-50 mt-2 w-80 rounded-lg border shadow-lg"
              >
                <div className="flex items-center justify-between border-b px-4 py-2">
                  <span className="text-sm font-medium">{tDashboard('notifications')}</span>
                  {unreadCount != null && unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => markAllRead.mutate()}
                    >
                      {tDashboard('markAllRead')}
                    </Button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto" aria-live="polite">
                  {!notifications?.length ? (
                    <p className="text-muted-foreground py-6 text-center text-sm">
                      {tDashboard('noNotifications')}
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
                          <p className="text-muted-foreground mt-0.5 text-xs">{notif.message}</p>
                        )}
                        <p className="text-muted-foreground mt-1 text-xs">
                          {formatLocaleDate(notif.created_at, 'MMM d, h:mm a', locale)}
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
          className="h-11 w-11"
          aria-label={theme === 'dark' ? tDashboard('switchToLight') : tDashboard('switchToDark')}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>
    </header>
  );
}
