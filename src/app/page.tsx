import Link from 'next/link';
import { PublicHeader } from '@/components/shared/layout/PublicHeader';
import { PublicFooter } from '@/components/shared/layout/PublicFooter';
import { Providers } from '@/components/providers/Providers';

export default function HomePage() {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <PublicHeader />
        <main className="flex-1">
          <section className="container mx-auto px-4 py-16">
            <div className="flex flex-col items-center justify-center space-y-8 text-center">
              <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl md:text-6xl">
                Warda Shamya
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                Premium dining experience with digital menu.
                Scan the QR code to explore our delicious offerings.
              </p>
              <div className="flex gap-4">
                <Link
                  href="/menu"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  View Menu
                </Link>
              </div>
            </div>
          </section>
        </main>
        <PublicFooter />
      </div>
    </Providers>
  );
}
