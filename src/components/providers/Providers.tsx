'use client';

import { QueryProvider } from './QueryProvider';
import { ThemeProvider } from './ThemeProvider';
import { BrandThemeProvider } from './BrandThemeProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="light" storageKey="doctorburger-theme">
      <QueryProvider>
        <BrandThemeProvider>{children}</BrandThemeProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
