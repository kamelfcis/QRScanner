'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const STORAGE_KEY = 'dashboard-sidebar-collapsed';

type SidebarCollapseContextValue = {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (value: boolean) => void;
  hoverExpanded: boolean;
  setHoverExpanded: (value: boolean) => void;
  isPeekOpen: boolean;
  isFullyOpen: boolean;
};

const SidebarCollapseContext = createContext<SidebarCollapseContextValue | null>(null);

export function SidebarCollapseProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useLocalStorage(STORAGE_KEY, false);
  const [hoverExpanded, setHoverExpanded] = useState(false);

  const toggle = useCallback(() => {
    setHoverExpanded(false);
    setCollapsed((prev) => !prev);
  }, [setCollapsed]);

  const setCollapsedWithReset = useCallback(
    (value: boolean) => {
      setHoverExpanded(false);
      setCollapsed(value);
    },
    [setCollapsed]
  );

  const isPeekOpen = collapsed && hoverExpanded;
  const isFullyOpen = !collapsed;

  const value = useMemo(
    () => ({
      collapsed,
      toggle,
      setCollapsed: setCollapsedWithReset,
      hoverExpanded,
      setHoverExpanded,
      isPeekOpen,
      isFullyOpen,
    }),
    [
      collapsed,
      toggle,
      setCollapsedWithReset,
      hoverExpanded,
      setHoverExpanded,
      isPeekOpen,
      isFullyOpen,
    ]
  );

  return (
    <SidebarCollapseContext.Provider value={value}>{children}</SidebarCollapseContext.Provider>
  );
}

export function useSidebarCollapse(): SidebarCollapseContextValue {
  const ctx = useContext(SidebarCollapseContext);
  if (!ctx) {
    throw new Error('useSidebarCollapse must be used within SidebarCollapseProvider');
  }
  return ctx;
}
