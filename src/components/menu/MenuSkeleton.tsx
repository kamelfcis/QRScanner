'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { MenuThemeScope } from '@/components/menu/MenuThemeScope';

export function MenuSkeleton() {
  return (
    <div data-menu-theme className="min-h-screen bg-[var(--menu-paper)]">
      <MenuThemeScope />
      <div className="bg-background/92 sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2.5 px-3 sm:h-16 sm:px-5">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-2 w-20" />
          </div>
          <Skeleton className="h-11 w-11 rounded-full" />
          <Skeleton className="h-11 w-11 rounded-full" />
        </div>
        <div className="h-px bg-[var(--menu-line)]" />
      </div>

      <Skeleton className="h-[clamp(180px,30vh,268px)] w-full rounded-none" />

      <div className="border-b border-[var(--menu-line)] bg-[var(--menu-paper)]">
        <div className="mx-auto flex max-w-6xl gap-5 overflow-hidden px-3 py-3.5 sm:gap-7 sm:px-5">
          {[12, 20, 16, 24, 14].map((w, i) => (
            <Skeleton key={i} className="h-4 shrink-0" style={{ width: `${w * 4}px` }} />
          ))}
        </div>
      </div>

      <MenuGridSkeleton />
    </div>
  );
}

export function MenuGridSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-5 sm:py-8">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-6 w-32" />
        <div className="h-px flex-1 bg-[var(--menu-line)]" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-[var(--menu-line)] bg-[var(--menu-surface)]"
          >
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="space-y-2 p-3 sm:p-3.5">
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
              <div className="flex items-center justify-between gap-2 pt-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-11 w-11 rounded-full sm:hidden" />
              </div>
              <Skeleton className="hidden h-10 w-full rounded-full sm:block" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
