'use client';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { cn } from '@/lib/utils';
import { useSidebarCollapse } from '@/components/dashboard/sidebar/SidebarCollapseContext';

export function SidebarCollapseToggle() {
  const { collapsed, toggle } = useSidebarCollapse();
  const tSidebar = useTranslations('sidebar');

  const label = collapsed ? tSidebar('expand') : tSidebar('collapse');
  const hint = collapsed ? tSidebar('hoverPeek') : undefined;

  return (
    <button
      type="button"
      aria-controls="dashboard-sidebar"
      aria-expanded={!collapsed}
      aria-pressed={collapsed}
      aria-label={label}
      title={hint ? `${label}. ${hint}` : label}
      onClick={toggle}
      className={cn(
        'hidden min-h-11 min-w-11 items-center justify-center rounded-xl md:inline-flex',
        'border-brand-secondary/25 bg-brand-secondary/10 border',
        'hover:bg-brand-secondary/15 hover:shadow-sm',
        'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'transition-colors duration-200 motion-reduce:transition-none'
      )}
    >
      <span className="bg-brand-secondary flex size-9 items-center justify-center rounded-lg text-white">
        {collapsed ? (
          <PanelLeftOpen className="size-5" strokeWidth={1.5} aria-hidden="true" />
        ) : (
          <PanelLeftClose className="size-5" strokeWidth={1.5} aria-hidden="true" />
        )}
      </span>
    </button>
  );
}
