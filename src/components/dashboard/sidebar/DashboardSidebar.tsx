'use client';

import { useCallback, useRef } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { getSiteNameAr, getSiteNameEn } from '@/lib/appName';
import { cn, getName } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useFeatureSettings, useRestaurantSettings } from '@/hooks/useSettings';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getDashboardNav, type DashboardNavItem } from '@/lib/navigation/dashboardNav';
import { getNavTone } from '@/lib/navigation/dashboardNavTones';
import { useSidebarCollapse } from '@/components/dashboard/sidebar/SidebarCollapseContext';

const HOVER_LEAVE_DELAY_MS = 150;

type SidebarPanelProps = {
  showLabels: boolean;
  compact: boolean;
  animateLabels?: boolean;
  name: string;
  logoUrl?: string | null;
  navItems: DashboardNavItem[];
  pathname: string;
  tSidebar: (key: string) => string;
  onSignOut: () => Promise<void>;
};

function SidebarNavLink({
  item,
  isActive,
  label,
  showLabels,
  compact,
  animateLabels,
}: {
  item: DashboardNavItem;
  isActive: boolean;
  label: string;
  showLabels: boolean;
  compact: boolean;
  animateLabels?: boolean;
}) {
  const tone = getNavTone(item.key);
  const Icon = item.icon;

  const labelClassName = cn(
    'truncate text-sm font-medium',
    isActive ? tone.label : 'text-muted-foreground'
  );

  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      aria-label={compact ? label : undefined}
      title={compact ? label : undefined}
      className={cn(
        'group relative flex min-h-11 cursor-pointer items-center rounded-xl border border-transparent px-2.5 py-2 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
        showLabels ? 'gap-3' : 'justify-center px-0',
        isActive
          ? 'bg-background/95 border-border/40 shadow-sm'
          : 'hover:bg-background/90 hover:border-border/50 hover:shadow-sm'
      )}
    >
      {isActive ? (
        <span
          className="bg-brand-secondary absolute inset-y-1.5 start-0 w-1 rounded-full"
          aria-hidden="true"
        />
      ) : null}
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl',
          tone.well,
          isActive && 'shadow-md ring-2 ring-white/25 brightness-110'
        )}
        aria-hidden="true"
      >
        <Icon className="size-5 text-white" strokeWidth={1.5} />
      </span>
      {showLabels ? (
        animateLabels ? (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={labelClassName}
          >
            {label}
          </motion.span>
        ) : (
          <span className={labelClassName}>{label}</span>
        )
      ) : null}
    </Link>
  );
}

function SidebarPanel({
  showLabels,
  compact,
  animateLabels = false,
  name,
  logoUrl,
  navItems,
  pathname,
  tSidebar,
  onSignOut,
}: SidebarPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div
        className={cn('flex h-16 items-center border-b', compact ? 'justify-center px-2' : 'px-6')}
      >
        <Link
          href="/dashboard"
          className={cn('flex min-w-0 items-center', compact ? 'justify-center' : 'gap-2.5')}
          title={compact ? name : undefined}
        >
          {logoUrl ? (
            <NextImage
              src={logoUrl}
              alt={name}
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 object-contain"
            />
          ) : null}
          {showLabels ? (
            animateLabels ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="text-primary font-heading truncate text-lg font-bold"
              >
                {name}
              </motion.span>
            ) : (
              <span className="text-primary font-heading truncate text-lg font-bold">{name}</span>
            )
          ) : null}
        </Link>
      </div>

      <ScrollArea className={cn('flex-1 py-4', compact ? 'px-1.5' : 'px-3')}>
        <nav className="space-y-1" aria-label={tSidebar('dashboard')}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const label = tSidebar(item.key);

            return (
              <SidebarNavLink
                key={item.href}
                item={item}
                isActive={isActive}
                label={label}
                showLabels={showLabels}
                compact={compact}
                animateLabels={animateLabels}
              />
            );
          })}
        </nav>
      </ScrollArea>

      <div className={cn('border-t', compact ? 'p-2' : 'p-4')}>
        <Button
          variant="ghost"
          className={cn(
            'min-h-11',
            compact ? 'w-full justify-center px-0' : 'w-full justify-start'
          )}
          onClick={async () => {
            try {
              await onSignOut();
            } catch {
              /* handled by useAuth */
            }
          }}
          aria-label={tSidebar('logout')}
          title={compact ? tSidebar('logout') : undefined}
        >
          <LogOut className={cn('h-4 w-4 shrink-0', showLabels && 'me-2')} strokeWidth={1.5} />
          {showLabels ? tSidebar('logout') : null}
        </Button>
      </div>
    </div>
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { data: settings } = useRestaurantSettings();
  const { data: features } = useFeatureSettings();
  const navItems = getDashboardNav(features);
  const { locale } = useI18n();
  const tSidebar = useTranslations('sidebar');
  const { collapsed, setHoverExpanded, isPeekOpen, isFullyOpen } = useSidebarCollapse();
  const prefersReducedMotion = useReducedMotion();
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const name = getName(locale, getSiteNameEn(settings), getSiteNameAr(settings));
  const isExpanded = isFullyOpen || isPeekOpen;

  const handleHoverEnter = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setHoverExpanded(true);
  }, [setHoverExpanded]);

  const handleHoverLeave = useCallback(() => {
    leaveTimerRef.current = setTimeout(() => {
      setHoverExpanded(false);
    }, HOVER_LEAVE_DELAY_MS);
  }, [setHoverExpanded]);

  const panelProps: Omit<SidebarPanelProps, 'showLabels' | 'compact' | 'animateLabels'> = {
    name,
    logoUrl: settings?.logo_url,
    navItems,
    pathname,
    tSidebar,
    onSignOut: signOut,
  };

  const widthTransition = prefersReducedMotion ? '' : 'transition-[width] duration-200 ease-in-out';

  return (
    <aside
      id="dashboard-sidebar"
      aria-expanded={isExpanded}
      className={cn(
        'bg-muted/40 hidden shrink-0 overflow-hidden border-r md:block',
        isExpanded ? 'w-64' : 'w-[72px]',
        widthTransition
      )}
      onMouseEnter={collapsed ? handleHoverEnter : undefined}
      onMouseLeave={collapsed ? handleHoverLeave : undefined}
    >
      <SidebarPanel
        showLabels={isExpanded}
        compact={!isExpanded}
        animateLabels={isPeekOpen && !prefersReducedMotion}
        {...panelProps}
      />
    </aside>
  );
}
