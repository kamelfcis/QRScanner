import { Suspense } from 'react';
import { IBM_Plex_Sans_Arabic } from 'next/font/google';

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-login-arabic',
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${arabic.variable} login-shell h-dvh max-h-dvh overflow-hidden`}>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <span className="size-5 animate-pulse rounded-full bg-[#51FE00]" aria-hidden />
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  );
}
