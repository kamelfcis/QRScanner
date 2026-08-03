'use client';

import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: Error | null;
  retry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred while loading the data.',
  error,
  retry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-destructive/50 bg-destructive/5 p-8 text-center',
        className
      )}
    >
      <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
      <h3 className="mt-4 text-lg font-semibold text-destructive">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {error?.message && (
        <p className="mt-2 text-xs text-muted-foreground">{error.message}</p>
      )}
      {retry && (
        <Button onClick={retry} variant="outline" className="mt-4">
          Try again
        </Button>
      )}
    </div>
  );
}
