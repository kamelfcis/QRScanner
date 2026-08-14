'use client';

import { useEffect } from 'react';

let mountCount = 0;

/**
 * Mirrors the menu palette attribute onto <body> so portalled surfaces
 * (sheets, dialogs, tooltips) inherit the Aklet tokens too. The wrapper
 * element still carries the attribute so the first server paint is correct.
 * Reference-counted so swapping between menu routes never drops it early.
 */
export function AkletThemeScope() {
  useEffect(() => {
    mountCount += 1;
    document.body.setAttribute('data-aklet-theme', '');

    return () => {
      mountCount -= 1;
      if (mountCount <= 0) {
        mountCount = 0;
        document.body.removeAttribute('data-aklet-theme');
      }
    };
  }, []);

  return null;
}
