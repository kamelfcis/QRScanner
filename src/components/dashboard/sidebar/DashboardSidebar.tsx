'use client';

import Link from 'next/link';
import NextImage from 'next/image';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { cn, getName } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { DASHBOARD_NAV } from '@/lib/navigation/dashboardNav';

export function DashboardSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { data: settings } = useRestaurantSettings();
  const { locale } = useI18n();
  const tSidebar = useTranslations('sidebar');
  const tCommon = useTranslations('common');

  const name = getName(
    locale,
    settings?.name_en || tCommon('appName'),
    settings?.name_ar || tCommon('appName')
  );

  return (
    <aside className="bg-muted/40 hidden w-64 border-r md:block">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
            {settings?.logo_url ? (
              <NextImage
                src={settings.logo_url}
                alt={name}
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 object-contain"
              />
            ) : null}
            <span className="text-primary font-heading truncate text-lg font-bold">{name}</span>
          </Link>
        </div>

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1" aria-label={tSidebar('dashboard')}>
            {DASHBOARD_NAV.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const label = tSidebar(item.key);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center space-x-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
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
        </ScrollArea>

        <div className="border-t p-4">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={async () => {
              try {
                await signOut();
              } catch {
                /* handled by useAuth */
              }
            }}
            aria-label={tSidebar('logout')}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {tSidebar('logout')}
          </Button>
        </div>
      </div>
    </aside>
  );
}
