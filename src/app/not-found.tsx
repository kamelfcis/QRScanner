import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6">
      <h1 className="font-heading text-2xl font-semibold">Not found</h1>
      <Link href="/" className="text-primary text-sm underline">
        Engaz
      </Link>
    </div>
  );
}
