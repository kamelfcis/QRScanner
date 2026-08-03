import { Providers } from '@/components/providers/Providers';

export default function MenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <main className="min-h-screen bg-background">{children}</main>
    </Providers>
  );
}
