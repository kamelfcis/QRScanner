import { Providers } from '@/components/providers/Providers';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </Providers>
  );
}
