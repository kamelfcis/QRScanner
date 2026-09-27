'use client';

import { useEffect, useLayoutEffect } from 'react';
import { isAlaKeefakTenant } from '@/i18n/config';
import { useThemeSettings } from '@/hooks/useSettings';
import { applyColorMode } from '@/lib/theme/ak-color-mode';
import { applyMenuBrandTheme, DEFAULT_THEME } from '@/lib/theme';
import { useAkColorMode } from '@/components/providers/AkColorModeProvider';

let mounted = 0;

/**
 * Mirrors the menu palette onto <body> so portalled surfaces (sheets, dialogs)
 * inherit it too. Page roots also carry the attribute for first paint.
 * Ref-counted so swapping skeleton for content never drops the theme.
 */
export function MenuThemeScope() {
  const { colorMode } = useAkColorMode();
  const { data: theme } = useThemeSettings();

  useLayoutEffect(() => {
    if (!isAlaKeefakTenant) return;
    applyMenuBrandTheme({ ...DEFAULT_THEME, ...theme });
  }, [theme, colorMode]);

  useEffect(() => {
    mounted += 1;
    document.body.setAttribute('data-menu-theme', '');
    if (isAlaKeefakTenant) {
      document.body.setAttribute('data-tenant', 'ala-keefak');
    }
    return () => {
      mounted -= 1;
      if (mounted <= 0) {
        mounted = 0;
        document.body.removeAttribute('data-menu-theme');
        document.body.removeAttribute('data-tenant');
        document.body.removeAttribute('data-color-mode');
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (!isAlaKeefakTenant) return;
    applyColorMode(colorMode);
  }, [colorMode]);

  return null;
}
