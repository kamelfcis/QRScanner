'use client';

import { THEME_STORAGE_KEY } from '@/lib/tenant-config';
import { QueryProvider } from './QueryProvider';
import { ThemeProvider } from './ThemeProvider';
import { BrandThemeProvider } from './BrandThemeProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="dark" storageKey={THEME_STORAGE_KEY}>
      <QueryProvider>
        <BrandThemeProvider>{children}</BrandThemeProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
