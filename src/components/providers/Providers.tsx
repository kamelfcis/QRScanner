'use client';

import { QueryProvider } from './QueryProvider';
import { ThemeProvider } from './ThemeProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="warda-shamya-theme">
      <QueryProvider>{children}</QueryProvider>
    </ThemeProvider>
  );
}
