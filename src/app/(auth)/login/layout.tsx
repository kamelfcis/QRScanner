import { Suspense } from 'react';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="login-shell h-dvh max-h-dvh overflow-hidden">
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Loading...
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  );
}
