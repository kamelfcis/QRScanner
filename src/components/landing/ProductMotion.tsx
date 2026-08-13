import { ENGAZ_LOGO_ALT, ENGAZ_LOGO_SRC } from '@/lib/brand';

export function ProductMotion() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-[#0b1220]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ENGAZ_LOGO_SRC}
        alt={ENGAZ_LOGO_ALT}
        className="mx-auto h-auto w-full max-w-md object-contain p-2 sm:max-w-xl sm:p-4"
      />
      <div className="pointer-events-none absolute inset-x-6 top-6 hidden h-28 overflow-hidden rounded-xl border border-white/10 bg-black/40 sm:block">
        <div className="hero-scan absolute inset-x-0 top-0 h-8" />
        <div className="seq-1 absolute inset-0 flex items-center justify-center text-sm font-medium text-primary">
          QR
        </div>
        <div className="seq-2 absolute inset-0 flex items-center justify-center text-sm font-medium text-white">
          Menu
        </div>
        <div className="seq-3 absolute inset-0 flex items-center justify-center text-sm font-medium text-primary">
          Dashboard
        </div>
      </div>
    </div>
  );
}
