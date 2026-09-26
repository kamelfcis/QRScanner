'use client';

import { useEffect, useLayoutEffect } from 'react';
import { isAlaKeefakTenant } from '@/i18n/config';
import { applyColorMode } from '@/lib/theme/ak-color-mode';
import { useAkColorMode } from '@/components/providers/AkColorModeProvider';

let mounted = 0;

/**
 * Mirrors the menu palette onto <body> so portalled surfaces (sheets, dialogs)
 * inherit it too. Page roots also carry the attribute for first paint.
 * Ref-counted so swapping skeleton for content never drops the theme.
 */
export function MenuThemeScope() {
  const { colorMode } = useAkColorMode();

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
