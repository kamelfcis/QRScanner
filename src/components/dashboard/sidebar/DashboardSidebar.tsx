'use client';

import { useCallback, useRef } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { getSiteNameAr, getSiteNameEn } from '@/lib/appName';
import { cn, getName } from '@/lib/utils';
import { sidebarPeekNavContainer, sidebarPeekNavItem } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useFeatureSettings, useRestaurantSettings } from '@/hooks/useSettings';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getDashboardNav, type DashboardNavItem } from '@/lib/navigation/dashboardNav';
import { getNavTone } from '@/lib/navigation/dashboardNavTones';
import { useSidebarCollapse } from '@/components/dashboard/sidebar/SidebarCollapseContext';
import { SidebarHoverOverlay } from '@/components/dashboard/sidebar/SidebarHoverOverlay';

const HOVER_LEAVE_DELAY_MS = 150;

type SidebarPanelProps = {
  showLabels: boolean;
  compact: boolean;
  staggerNavLabels?: boolean;
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
}: {
  item: DashboardNavItem;
  isActive: boolean;
  label: string;
  showLabels: boolean;
  compact: boolean;
}) {
  const tone = getNavTone(item.key);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      aria-label={compact ? label : undefined}
      title={compact ? label : undefined}
      className={cn(
        'flex items-center rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
        showLabels ? 'gap-3 px-3 py-2' : 'min-h-11 justify-center px-0 py-2',
        isActive ? 'ring-foreground/15 ring-1' : 'hover:bg-muted/50'
      )}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl',
          tone.well,
          isActive && 'shadow-md ring-2 ring-white/30 brightness-110'
        )}
        aria-hidden="true"
      >
        <Icon className="size-5 text-white" strokeWidth={1.5} />
      </span>
      {showLabels ? (
        <span
          className={cn('truncate font-medium', isActive ? tone.label : 'text-muted-foreground')}
        >
          {label}
        </span>
      ) : null}
    </Link>
  );
}

function SidebarPanel({
  showLabels,
  compact,
  staggerNavLabels = false,
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
            <span className="text-primary font-heading truncate text-lg font-bold">{name}</span>
          ) : null}
        </Link>
      </div>

      <ScrollArea className={cn('flex-1 py-4', compact ? 'px-1.5' : 'px-3')}>
        {staggerNavLabels ? (
          <motion.nav
            className="space-y-1"
            aria-label={tSidebar('dashboard')}
            variants={sidebarPeekNavContainer}
            initial="hidden"
            animate="visible"
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const label = tSidebar(item.key);

              return (
                <motion.div key={item.href} variants={sidebarPeekNavItem}>
                  <SidebarNavLink
                    item={item}
                    isActive={isActive}
                    label={label}
                    showLabels={showLabels}
                    compact={compact}
                  />
                </motion.div>
              );
            })}
          </motion.nav>
        ) : (
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
                />
              );
            })}
          </nav>
        )}
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

  const panelProps: Omit<SidebarPanelProps, 'showLabels' | 'compact'> = {
    name,
    logoUrl: settings?.logo_url,
    navItems,
    pathname,
    tSidebar,
    onSignOut: signOut,
  };

  const widthTransition = prefersReducedMotion ? '' : 'transition-[width] duration-200 ease-in-out';

  if (isFullyOpen) {
    return (
      <aside
        id="dashboard-sidebar"
        aria-expanded
        className={cn(
          'bg-muted/40 hidden w-64 shrink-0 overflow-hidden border-r md:block',
          widthTransition
        )}
      >
        <SidebarPanel showLabels compact={false} {...panelProps} />
      </aside>
    );
  }

  return (
    <>
      <aside
        id="dashboard-sidebar"
        aria-expanded={isPeekOpen}
        className={cn(
          'bg-muted/40 hidden w-[72px] shrink-0 overflow-hidden border-r md:block',
          widthTransition
        )}
        onMouseEnter={handleHoverEnter}
        onMouseLeave={handleHoverLeave}
      >
        <SidebarPanel showLabels={false} compact {...panelProps} />
      </aside>

      <SidebarHoverOverlay
        open={isPeekOpen}
        slideFrom={locale === 'ar' ? '100%' : '-100%'}
        prefersReducedMotion={prefersReducedMotion}
        onHoverEnter={handleHoverEnter}
        onHoverLeave={handleHoverLeave}
      >
        <SidebarPanel
          showLabels
          compact={false}
          staggerNavLabels={!prefersReducedMotion}
          {...panelProps}
        />
      </SidebarHoverOverlay>
    </>
  );
}
