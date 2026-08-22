'use client';

import Link from 'next/link';
import NextImage from 'next/image';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { getSiteNameAr, getSiteNameEn } from '@/lib/appName';
import { cn, getName } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useFeatureSettings, useRestaurantSettings } from '@/hooks/useSettings';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getDashboardNav } from '@/lib/navigation/dashboardNav';
import { useSidebarCollapse } from '@/components/dashboard/sidebar/SidebarCollapseContext';

export function DashboardSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { data: settings } = useRestaurantSettings();
  const { data: features } = useFeatureSettings();
  const navItems = getDashboardNav(features);
  const { locale } = useI18n();
  const tSidebar = useTranslations('sidebar');
  const { collapsed } = useSidebarCollapse();
  const prefersReducedMotion = useReducedMotion();

  const name = getName(locale, getSiteNameEn(settings), getSiteNameAr(settings));

  return (
    <aside
      id="dashboard-sidebar"
      aria-expanded={!collapsed}
      className={cn(
        'bg-muted/40 hidden shrink-0 overflow-hidden border-r md:block',
        prefersReducedMotion ? '' : 'transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        <div
          className={cn(
            'flex h-16 items-center border-b',
            collapsed ? 'justify-center px-2' : 'px-6'
          )}
        >
          <Link
            href="/dashboard"
            className={cn('flex min-w-0 items-center', collapsed ? 'justify-center' : 'gap-2.5')}
            title={collapsed ? name : undefined}
          >
            {settings?.logo_url ? (
              <NextImage
                src={settings.logo_url}
                alt={name}
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 object-contain"
              />
            ) : null}
            {!collapsed ? (
              <span className="text-primary font-heading truncate text-lg font-bold">{name}</span>
            ) : null}
          </Link>
        </div>

        <ScrollArea className={cn('flex-1 py-4', collapsed ? 'px-1.5' : 'px-3')}>
          <nav className="space-y-1" aria-label={tSidebar('dashboard')}>
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const label = tSidebar(item.key);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={collapsed ? label : undefined}
                  title={collapsed ? label : undefined}
                  className={cn(
                    'flex items-center rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
                    collapsed
                      ? 'min-h-11 min-w-11 justify-center px-0 py-2.5'
                      : 'gap-3 px-3 py-2.5',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                  {!collapsed ? <span className="truncate">{label}</span> : null}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <div className={cn('border-t', collapsed ? 'p-2' : 'p-4')}>
          <Button
            variant="ghost"
            className={cn(
              'min-h-11',
              collapsed ? 'w-full justify-center px-0' : 'w-full justify-start'
            )}
            onClick={async () => {
              try {
                await signOut();
              } catch {
                /* handled by useAuth */
              }
            }}
            aria-label={tSidebar('logout')}
            title={collapsed ? tSidebar('logout') : undefined}
          >
            <LogOut className={cn('h-4 w-4 shrink-0', !collapsed && 'me-2')} strokeWidth={1.5} />
            {!collapsed ? tSidebar('logout') : null}
          </Button>
        </div>
      </div>
    </aside>
  );
}
