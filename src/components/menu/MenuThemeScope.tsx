'use client';

import { useEffect } from 'react';
import { isAlaKeefakTenant } from '@/i18n/config';

let mounted = 0;

/**
 * Mirrors the menu palette onto <body> so portalled surfaces (sheets, dialogs)
 * inherit it too. Page roots also carry the attribute for first paint.
 * Ref-counted so swapping skeleton for content never drops the theme.
 */
export function MenuThemeScope() {
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
      }
    };
  }, []);

  return null;
}
