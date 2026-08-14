'use client';

function Shimmer({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-[var(--hm-surface-muted)] ${className}`} />;
}

export function MenuSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--hm-paper)]">
      <div className="border-b border-[var(--hm-line)] bg-[var(--hm-surface)]">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
          <Shimmer className="h-11 w-11 rounded-[var(--hm-radius-sm)]" />
          <div className="flex-1 space-y-1.5">
            <Shimmer className="h-4 w-40" />
            <Shimmer className="h-3 w-56" />
          </div>
          <Shimmer className="h-10 w-10 rounded-[var(--hm-radius-sm)]" />
        </div>
      </div>

      <div className="border-b border-[var(--hm-line)] bg-[var(--hm-surface)]">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2 sm:px-4">
          <Shimmer className="h-11 flex-1 rounded-[var(--hm-radius)]" />
          <Shimmer className="h-11 w-11 rounded-[var(--hm-radius)]" />
        </div>
        <div className="mx-auto flex max-w-7xl gap-2 overflow-hidden px-3 pb-2.5 sm:px-4">
          {['w-16', 'w-24', 'w-20', 'w-28', 'w-[4.5rem]', 'w-24'].map((width, index) => (
            <Shimmer key={index} className={`h-9 shrink-0 rounded-full ${width}`} />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        <Shimmer className="mb-3 h-5 w-36" />
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-[var(--hm-radius)] border border-[var(--hm-line)] bg-[var(--hm-surface)]"
            >
              <Shimmer className="aspect-square w-full rounded-none" />
              <div className="space-y-2 p-2.5">
                <Shimmer className="h-3.5 w-4/5" />
                <Shimmer className="h-3 w-1/3 rounded-full" />
                <Shimmer className="h-4 w-1/2" />
                <Shimmer className="h-9 w-full rounded-[var(--hm-radius-sm)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
