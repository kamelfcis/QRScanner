'use client';

import { AkletThemeScope } from '@/components/menu/AkletThemeScope';

/** Mirrors the real layout: 56px header, hero band, chip rail, square cards. */
export function MenuSkeleton() {
  return (
    <div data-aklet-theme className="bg-aklet-paper min-h-screen">
      <AkletThemeScope />

      <div className="bg-aklet-paper/92 border-aklet-line/70 sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-[var(--aklet-header-h)] max-w-6xl items-center gap-2.5 px-3 sm:px-5">
          <Block className="h-9 w-9 rounded-md" />
          <Block className="h-4 w-32 rounded" />
          <div className="ms-auto flex gap-2">
            <Block className="h-9 w-9 rounded-full" />
            <Block className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </div>

      <Block className="h-[30svh] min-h-[220px] w-full rounded-none sm:h-[34svh] sm:max-h-[380px]" />

      <div className="border-aklet-line/60 border-b px-3 py-2 sm:px-5">
        <div className="mx-auto flex max-w-6xl gap-2">
          <Block className="h-8 w-28 rounded-full" />
          <Block className="ms-auto h-8 w-16 rounded-full" />
        </div>
      </div>

      <div className="border-aklet-line/70 border-b px-3 py-2.5 sm:px-5">
        <div className="mx-auto flex max-w-6xl gap-2 overflow-hidden">
          {[12, 20, 16, 24, 14].map((w, i) => (
            <Block key={i} className={`h-9 rounded-full`} style={{ width: `${w * 4}px` }} />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-5 sm:py-6">
        <Block className="mb-2 h-3 w-20 rounded" />
        <Block className="mb-4 h-6 w-40 rounded" />
        <div className="grid grid-cols-2 items-stretch gap-2.5 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="border-aklet-line/70 bg-aklet-paper-soft overflow-hidden rounded-xl border"
            >
              <Block className="aspect-square w-full rounded-none" />
              <div className="space-y-2 p-2.5 sm:p-3">
                <Block className="h-3.5 w-3/4 rounded" />
                <Block className="h-3 w-1/2 rounded" />
                <Block className="h-4 w-16 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Block({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      aria-hidden
      style={style}
      className={`bg-aklet-sand/70 animate-pulse rounded-lg ${className ?? ''}`}
    />
  );
}
