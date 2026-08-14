'use client';

import { useEffect } from 'react';

/**
 * Mirrors the market token scope onto <body> so portalled surfaces
 * (sheets, dialogs) resolve the same --hm-* variables as the page shell.
 */
export function HarameenThemeScope() {
  useEffect(() => {
    document.body.setAttribute('data-harameen-theme', '');
    return () => {
      document.body.removeAttribute('data-harameen-theme');
    };
  }, []);

  return null;
}
