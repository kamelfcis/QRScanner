'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function MenuSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Skeleton className="h-6 w-40" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="sticky top-16 z-30 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex gap-2 overflow-hidden px-4 py-3">
          <Skeleton className="h-8 w-12 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-14 rounded-md" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <Skeleton className="mb-2 h-7 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-lg border shadow-sm">
              <Skeleton className="aspect-[4/3] w-full" />
              <div className="p-4">
                <Skeleton className="mb-2 h-5 w-3/4" />
                <Skeleton className="mb-2 h-4 w-1/2" />
                <Skeleton className="mb-3 h-3 w-full" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-5 w-14" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
