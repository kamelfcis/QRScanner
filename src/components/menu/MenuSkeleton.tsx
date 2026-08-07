'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function MenuSkeleton() {
  return (
    <div className="bg-background min-h-screen">
      <div className="bg-background/95 sticky top-0 z-40 border-b backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Skeleton className="h-6 w-40" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="bg-background/95 sticky top-16 z-30 border-b backdrop-blur">
        <div className="container mx-auto flex gap-2 overflow-hidden px-4 py-3">
          <Skeleton className="h-8 w-12 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-14 rounded-md" />
        </div>
      </div>

      <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6">
        <div className="mb-4">
          <Skeleton className="mb-2 h-7 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="border-border/50 bg-card/80 overflow-hidden rounded-2xl border shadow-sm"
            >
              <Skeleton className="aspect-square w-full sm:aspect-[4/3]" />
              <div className="space-y-2 p-3 sm:p-4">
                <Skeleton className="h-4 w-3/4 sm:h-5" />
                <Skeleton className="hidden h-4 w-1/2 sm:block" />
                <Skeleton className="hidden h-3 w-full sm:block" />
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-14 sm:h-6 sm:w-16" />
                  <Skeleton className="hidden h-5 w-14 sm:block" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
