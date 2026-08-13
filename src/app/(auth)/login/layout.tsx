import { Suspense } from 'react';
import { IBM_Plex_Mono, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { LoginAtmosphere } from '@/components/engaz/LoginAtmosphere';

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-login-arabic',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-login-mono',
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${arabic.variable} ${mono.variable} login-shell relative isolate h-dvh max-h-dvh overflow-hidden`}
    >
      <LoginAtmosphere />
      <Suspense
        fallback={
          <div className="relative flex h-full items-center justify-center">
            <span className="size-5 animate-pulse rounded-full bg-[#51FE00]" aria-hidden />
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  );
}
