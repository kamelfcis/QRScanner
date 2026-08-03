import { Providers } from '@/components/providers/Providers';
import { PublicHeader } from '@/components/shared/layout/PublicHeader';
import { PublicFooter } from '@/components/shared/layout/PublicFooter';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <PublicHeader />
        <main className="flex-1" id="main-content">
          {children}
        </main>
        <PublicFooter />
      </div>
    </Providers>
  );
}
