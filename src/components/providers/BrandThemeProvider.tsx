'use client';

import { useEffect } from 'react';
import { useThemeSettings } from '@/hooks/useSettings';
import { applyBrandTheme, DEFAULT_THEME } from '@/lib/theme';
import { useTheme } from './ThemeProvider';

export function BrandThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: theme } = useThemeSettings();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const merged = { ...DEFAULT_THEME, ...theme };
    applyBrandTheme(merged, resolvedTheme);

    return () => {
      // Keep applied vars on unmount; globals.css defaults remain as fallback in CSS
    };
  }, [theme, resolvedTheme]);

  return <>{children}</>;
}
