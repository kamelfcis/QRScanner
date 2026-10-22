'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

/** Full-screen Mazen store notice when public Supabase reads fail. */
export function ServerDownScreen() {
  return (
    <div
      role="alert"
      dir="rtl"
      lang="ar"
      className="bg-background text-foreground flex min-h-screen w-full flex-col items-center justify-center px-6 py-16"
      style={{ textAlign: 'center' }}
    >
      <h1 className="font-heading text-foreground text-4xl font-bold tracking-tight sm:text-5xl">
        السيرفر down
      </h1>
      <p className="text-muted-foreground mx-auto mt-4 max-w-md text-base leading-relaxed sm:text-lg">
        تعذر الاتصال بالخادم. حاول مرة أخرى بعد قليل.
      </p>
      <Button
        type="button"
        size="lg"
        className="bg-brand-accent hover:bg-brand-accent/90 mt-8 h-11 px-8 text-base font-semibold text-black"
        onClick={() => window.location.reload()}
      >
        إعادة المحاولة
      </Button>
    </div>
  );
}

/** Stable first paint while a primary read is still in flight. */
export function StoreLoadingShell() {
  return (
    <div
      className="bg-background flex min-h-screen w-full items-center justify-center"
      aria-busy="true"
    >
      <div className="border-primary/30 border-t-primary h-8 w-8 animate-spin rounded-full border-2" />
    </div>
  );
}

/**
 * Down UI is client-only, after the query has failed.
 * Server HTML and the first client render stay on the loading shell.
 */
export function useShowServerDown(failed: boolean) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- gate the down page until after hydration
    setMounted(true);
  }, []);

  return mounted && failed;
}
