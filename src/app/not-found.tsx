import Link from 'next/link';
import { ENGAZ_LOGO_ALT, ENGAZ_LOGO_SRC } from '@/lib/brand';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ENGAZ_LOGO_SRC} alt={ENGAZ_LOGO_ALT} className="h-16 w-auto max-w-[200px] object-contain" />
      <h1 className="font-heading text-2xl font-semibold">Not found</h1>
      <Link href="/" className="text-primary text-sm underline">
        Back to home
      </Link>
    </div>
  );
}
