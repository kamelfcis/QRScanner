import { Providers } from '@/components/providers/Providers';
import { HarameenThemeScope } from '@/components/menu/HarameenThemeScope';

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <HarameenThemeScope />
      <main data-harameen-theme className="min-h-screen bg-[var(--hm-paper)] text-[var(--hm-ink)]">
        {children}
      </main>
    </Providers>
  );
}
