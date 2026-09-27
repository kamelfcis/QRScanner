'use client';

import { QueryProvider } from './QueryProvider';
import { ThemeProvider } from './ThemeProvider';
import { BrandThemeProvider } from './BrandThemeProvider';
import { AkColorModeProvider } from './AkColorModeProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="light" storageKey="doctorburger-theme">
      <AkColorModeProvider>
        <QueryProvider>
          <BrandThemeProvider>{children}</BrandThemeProvider>
        </QueryProvider>
      </AkColorModeProvider>
    </ThemeProvider>
  );
}
