import { WifiOff } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-primary/10">
        <WifiOff className="h-10 w-10 text-brand-primary" />
      </div>
      <h1 className="mb-2 text-3xl font-bold text-foreground">You are offline</h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        Please check your internet connection and try again.
      </p>
      <Link href="/">
        <Button>Go back home</Button>
      </Link>
    </div>
  );
}
